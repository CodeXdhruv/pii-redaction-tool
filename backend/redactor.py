import re
from presidio_analyzer import AnalyzerEngine
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
        self.faker = Faker()
        Faker.seed(42)
        self.pii_cache = {}
        self.entity_mapping = {
            "PERSON": "Full Name",
            "EMAIL_ADDRESS": "Email Address",
            "PHONE_NUMBER": "Phone Number",
            "ORGANIZATION": "Company Name",
            "LOCATION": "Physical Address"
        }

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
            fake_val = self.faker.phone_number()
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
