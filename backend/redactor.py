import re
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider
from faker import Faker

class PIIRedactor:
    def __init__(self, spacy_model="en_core_web_sm"):
        configuration = {
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": spacy_model}]
        }
        provider = NlpEngineProvider(nlp_configuration=configuration)
        nlp_engine = provider.create_engine()
        self.analyzer = AnalyzerEngine(nlp_engine=nlp_engine)
        self._add_custom_recognizers()
        self.faker = Faker()
        Faker.seed(42)
        self.pii_cache = {}
        self.entity_mapping = {
            "PERSON": "Full Name",
            "EMAIL_ADDRESS": "Email Address",
            "PHONE_NUMBER": "Phone Number",
            "ORGANIZATION": "Company Name",
            "LOCATION": "Physical Address",
            "US_SSN": "Social Security Number",
            "CREDIT_CARD": "Credit Card Number",
            "DATE_TIME": "Date of Birth / Date",
            "IP_ADDRESS": "IP Address"
        }

    def _add_custom_recognizers(self):
        indian_phone_pattern = Pattern(
            name="indian_phone_pattern",
            regex=r"(?:\+91[\s-]?)?[6789]\d{9}|\d{5}[-\s]\d{5}",
            score=0.95
        )
        phone_recognizer = PatternRecognizer(
            supported_entity="PHONE_NUMBER",
            patterns=[indian_phone_pattern],
            context=["phone", "mobile", "contact", "tel", "telephone", "cell"]
        )
        self.analyzer.registry.add_recognizer(phone_recognizer)

        ssn_pattern = Pattern(
            name="ssn_pattern",
            regex=r"\d{3}-\d{2}-\d{4}",
            score=0.95
        )
        ssn_recognizer = PatternRecognizer(
            supported_entity="US_SSN",
            patterns=[ssn_pattern],
            context=["ssn", "social security", "sec number"]
        )
        self.analyzer.registry.add_recognizer(ssn_recognizer)

        company_pattern = Pattern(
            name="company_pattern",
            regex=r"[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)*\s+(?:Limited|Ltd\.?|Bank|Securities|Corporation|Pvt\.?\s+Ltd\.?|Co\.)",
            score=0.95
        )
        company_recognizer = PatternRecognizer(
            supported_entity="ORGANIZATION",
            patterns=[company_pattern],
            context=["company", "firm", "bank", "manager", "auditor", "underwriter"]
        )
        self.analyzer.registry.add_recognizer(company_recognizer)

        date_pattern1 = Pattern(
            name="date_pattern_text",
            regex=r"\d{1,2}[-/\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*[-/\s]\d{2,4}",
            score=0.95
        )
        date_pattern2 = Pattern(
            name="date_pattern_num",
            regex=r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}",
            score=0.95
        )
        date_recognizer = PatternRecognizer(
            supported_entity="DATE_TIME",
            patterns=[date_pattern1, date_pattern2],
            context=["birth", "dob", "born", "date", "dated"]
        )
        self.analyzer.registry.add_recognizer(date_recognizer)

        cc_pattern = Pattern(
            name="cc_pattern",
            regex=r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}",
            score=0.95
        )
        cc_recognizer = PatternRecognizer(
            supported_entity="CREDIT_CARD",
            patterns=[cc_pattern],
            context=["card", "credit card", "visa", "mastercard"]
        )
        self.analyzer.registry.add_recognizer(cc_recognizer)

    def get_fake_replacement(self, text: str, entity_type: str) -> str:
        cache_key = (text.strip().lower(), entity_type)
        if cache_key in self.pii_cache:
            return self.pii_cache[cache_key]
        
        fake_val = ""
        if entity_type == "PERSON":
            fake_val = self.faker.name()
        elif entity_type == "EMAIL_ADDRESS":
            fake_val = self.faker.email()
        elif entity_type == "PHONE_NUMBER":
            fake_val = f"+91 {self.faker.numerify('##########')}"
        elif entity_type == "ORGANIZATION":
            fake_val = self.faker.company()
        elif entity_type == "LOCATION":
            fake_val = self.faker.address().replace("\n", ", ")
        elif entity_type == "US_SSN":
            fake_val = self.faker.ssn()
        elif entity_type == "CREDIT_CARD":
            fake_val = self.faker.credit_card_number()
        elif entity_type == "DATE_TIME":
            if len(text) == 4 and text.isdigit():
                fake_val = str(self.faker.random_int(1970, 2005))
            else:
                fake_val = self.faker.date_of_birth(minimum_age=18, maximum_age=90).strftime("%d-%B-%Y")
        elif entity_type == "IP_ADDRESS":
            fake_val = self.faker.ipv4()
        else:
            fake_val = f"<{entity_type}_REDACTED>"
            
        self.pii_cache[cache_key] = fake_val
        return fake_val

    def analyze_text(self, text: str):
        if not text.strip():
            return []
        results = self.analyzer.analyze(
            text=text,
            language="en",
            entities=list(self.entity_mapping.keys())
        )
        return sorted(results, key=lambda x: x.start)

    def redact_text_block(self, text: str) -> tuple[str, list[dict]]:
        results = self.analyze_text(text)
        if not results:
            return text, []
        results_desc = sorted(results, key=lambda x: x.start, reverse=True)
        redacted_text = text
        changes = []
        for r in results_desc:
            original_val = text[r.start:r.end]
            fake_val = self.get_fake_replacement(original_val, r.entity_type)
            redacted_text = redacted_text[:r.start] + fake_val + redacted_text[r.end:]
            changes.append({
                "original": original_val,
                "replacement": fake_val,
                "entity_type": self.entity_mapping.get(r.entity_type, r.entity_type),
                "confidence": r.score
            })
        return redacted_text, changes[::-1]
