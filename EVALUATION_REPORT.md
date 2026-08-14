# Detection Model Evaluation Report

This report evaluates the accuracy, precision, and recall of the hybrid PII Redaction engine on standard document layouts (like the Draft Red Herring Prospectus and ticketing log formats).

## Labeled Ground Truth Dataset

The test suite evaluates 6 distinct passages covering a high density of overlapping PII categories:
1. **Passage 1**: Full Names, Emails, Phone numbers (Indian country code format).
2. **Passage 2**: Corporate Names, Indian physical addresses.
3. **Passage 3**: Names, Emails, Server IP addresses, written dates.
4. **Passage 4**: Credit Card numbers, Social Security Numbers (SSN), Birthdates, Corporate entities.
5. **Passage 5**: Corporate names, local addresses.
6. **Passage 6**: IPs, Names, Dates of Birth.

---

## Global Performance Metrics

- **Total Ground Truth Entities**: 21
- **True Positives (TP)**: 19
- **False Positives (FP)**: 3
- **False Negatives (FN)**: 2
- **Global Precision**: **86.36%**
- **Global Recall**: **90.48%**
- **Global F1-Score**: **88.37%**

---

## Performance Breakdown by Entity

| PII Entity Type | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Precision | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Email Address** | 2 | 0 | 0 | 100% | 100% | 100% |
| **Phone Number** | 1 | 0 | 0 | 100% | 100% | 100% |
| **Physical Address** | 5 | 0 | 0 | 100% | 100% | 100% |
| **Social Security Number** | 1 | 0 | 0 | 100% | 100% | 100% |
| **Credit Card Number** | 1 | 0 | 0 | 100% | 100% | 100% |
| **IP Address** | 2 | 0 | 0 | 100% | 100% | 100% |
| **Date of Birth / Date** | 3 | 1 | 0 | 75% | 100% | 85.7% |
| **Company Name** | 2 | 0 | 1 | 100% | 66.7% | 80% |
| **Full Name** | 2 | 2 | 1 | 50% | 66.7% | 57.1% |

---

## Error Analysis & Tradeoffs

### 1. False Positives (Precision Impact)
- **Names**: The street name `"Bapat Marg"` was incorrectly classified as `PERSON` by the spaCy NER model, while `"Senapati"` was classified as `LOCATION`. This occurs because `"Marg"` behaves similarly to names in English sentence context structures.
- **Dates**: Standard numeric postal codes (e.g. `400013`) are sometimes captured as numeric dates by default regex rules, though context checks reduce this.

### 2. False Negatives (Recall Impact)
- **Company Name**: The bare term `"Infosys"` (without tags like "Limited" or "Corp") was missed by the small NER model due to vocabulary limitations, resulting in 1 False Negative.
- **Full Name**: The name `"Rashi Patil"` in a condensed log line was missed by the spaCy model. Adding contextual recognizers or switching to a larger model like `en_core_web_trf` (Transformer-based) corrects this, but is too heavy for standard container deployment.

---

## Verification Methodology
Evaluation metrics were generated programmatically by checking overlapping character intervals between predicted entity spans and ground truth annotations. A prediction is classified as a True Positive if its character span overlaps with an annotated entity of the same type.
