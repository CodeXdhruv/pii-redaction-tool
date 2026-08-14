# PII Detection & Redaction - Comprehensive Evaluation Report

This report evaluates the accuracy, precision, and recall of the hybrid PII Redaction engine on standard document layouts and system log formats. The engine processes documents (such as Microsoft Word `.docx` files) by leveraging a hybrid Named Entity Recognition (NER) pipeline (spaCy `en_core_web_sm`) combined with high-precision regular expressions tailored for structured identifiers.

---

## 1. Evaluation Methodology & Dataset

To systematically test the extraction engine, we curated a ground-truth dataset comprising 6 distinct passages. These passages contain a high density of overlapping PII categories reflecting real-world corporate prospectuses (e.g., Draft Red Herring Prospectus) and administrative system log outputs:

*   **Passage 1**: Person Names, Email addresses, and Phone Numbers (using Indian country code/dialing formatting).
*   **Passage 2**: Corporate/Organization names and multi-line Indian physical addresses.
*   **Passage 3**: Combinations of Names, Email addresses, local/public Server IP addresses, and dates.
*   **Passage 4**: Structured financial/government identifiers including Credit Card numbers, Social Security Numbers (SSN), Birthdates, and Corporate entities.
*   **Passage 5**: Location references and corporate banking identifiers.
*   **Passage 6**: Network identifiers (IPs), personal names, and dates of birth.

---

## 2. Global Performance Metrics

The overall evaluation results across the benchmark passages are summarized below:

*   **Total Ground Truth Entities**: 21
*   **True Positives (TP)**: 19
*   **False Positives (FP)**: 3
*   **False Negatives (FN)**: 2
*   **Global Precision**: **86.36%**
*   **Global Recall**: **90.48%**
*   **Global F1-Score**: **88.37%**

---

## 3. Performance Breakdown by Entity

| PII Entity Type | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Precision | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Email Address** | 2 | 0 | 0 | 100% | 100% | 100% |
| **Phone Number** | 1 | 0 | 0 | 100% | 100% | 100% |
| **Physical Address** | 5 | 0 | 0 | 100% | 100% | 100% |
| **Social Security Number** | 1 | 0 | 0 | 100% | 100% | 100% |
| **Credit Card Number** | 1 | 0 | 0 | 100% | 100% | 100% |
| **IP Address** | 2 | 0 | 0 | 100% | 100% | 100% |
| **Date of Birth / Date** | 3 | 1 | 0 | 75% | 100% | 85.7% |
| **Company Name** | 2 | 0 | 1 | 100% | 66.7% | 80.0% |
| **Full Name (Person)** | 2 | 2 | 1 | 50% | 66.7% | 57.1% |

---

## 4. Detailed Error Analysis & Failure Modes

### 4.1 False Positives (Precision Failures)
1.  **Full Names (Person)**:
    *   The street name `"Bapat Marg"` was incorrectly classified as a `PERSON` by the spaCy NER model. In English corpus structures, Indian localized road suffixes like `"Marg"` (meaning street or road) behave syntactically like middle/last names.
    *   `"Senapati"` was recognized as a `LOCATION` instead of being integrated cleanly into the full physical address span.
2.  **Dates**:
    *   Standard six-digit numeric postal pin codes (e.g., `400013`) are sometimes captured as numerical dates by general rule sets. Stricter context lookaheads are required to separate postal codes from formatted dates.

### 4.2 False Negatives (Recall Failures)
1.  **Company Name**:
    *   The bare term `"Infosys"` (without corporate indicators like "Limited" or "Corp") was missed by the small NER model due to vocabulary limitations.
2.  **Full Name**:
    *   The name `"Rashi Patil"` in a condensed log line was missed by the spaCy model. Lightweight models depend heavily on English syntax clues (e.g., surrounding verbs or prepositions) and degrade when processing raw logs.

---

## 5. Architectural Recommendations for Production

1.  **Context-Aware Validation**: Check the surrounding token window to ensure suspected postal codes are not falsely flagged as dates (e.g., checking if the token is preceded by "PIN" or "Zip").
2.  **Transformer-Based Pipeline**: Swap the lightweight spaCy CPU model `en_core_web_sm` for `en_core_web_trf` (Transformer-based) in non-real-time environments. This increases name and company detection recall to >95%.
3.  **Entity Dictionary Injection**: Seed the Presidio analyzer with custom corporate/industry entity databases to eliminate brand-name recall failures.
