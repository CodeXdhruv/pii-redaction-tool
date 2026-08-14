# PII Redaction Tool

An enterprise-ready, high-efficiency tool to automatically detect, redact, and replace Personally Identifiable Information (PII) from regulatory files (like Draft Red Herring Prospectus documents) while preserving document formatting and structure.

## Technical Architecture & Approach

This tool implements a **hybrid model architecture** combining machine learning Named Entity Recognition (NER), rule-based pattern matching, and contextual analysis to maximize PII recall while preserving system efficiency:

1. **Named Entity Recognition (NER)**: Powered by spaCy (`en_core_web_sm`) to extract complex entities like *Names* and *Company Names* that lack structured patterns.
2. **Context-Aware Rule Engines**: Uses Microsoft Presidio Analyzer for structured patterns (Emails, Credit Cards, SSNs, IP Addresses) combined with custom contextual patterns for Indian phone numbers (such as `+91`) and local physical addresses.
3. **Deterministic Mocking**: Leverages `Faker` with seed maps ensuring that every unique original PII token maps to a single realistic replacement consistently across the document.
4. **Run-level DOCX Modification**: Reconstructs paragraphs and runs in python-docx at the character offset level, keeping all style XML nodes (bold, color, size, alignments) intact.

## Performance Optimizations

To ensure extreme efficiency, several optimizations were implemented:
1. **Lightweight spaCy pipeline**: Unused pipeline components (`parser`, `tagger`, `lemmatizer`, `attribute_ruler`) are removed at initialization. Only the tokenization and `ner` pipes remain active, reducing NER latency by ~30%.
2. **Linear-Time run mapping**: Character offset run mapping is calculated once per paragraph instead of rebuilding it on every single replacement. Since processing occurs from right to left (descending offset order), replacements never invalidate prior mappings.
3. **Paragraph Caching**: Identical text blocks (such as repetitive page headers, footers, or empty tables common in prospectus files) are cached after their first analysis, completely bypassing the spaCy and Presidio engines on repeat occurrences.
4. **Early Exit Threshold**: Bypasses running NLP analysis on short paragraph noise (less than 4 characters), reducing redundant calculations.

These combined changes reduced full document processing time from **36.38 seconds** to **18.17 seconds** (a **50.1% speedup**)!

## Performance & Tradeoffs

- **Speed/Memory Tradeoff**: We chose `en_core_web_sm` to keep memory footprint under 250MB (allowing free tier deployment on Render, which has a 512MB RAM cap), augmenting it with custom pattern regexes to achieve accuracy comparable to `en_core_web_lg` (560MB).
- **False Positives**: General street names ending in terms like `Marg` or `Road` (e.g. `Bapat Marg`) are sometimes misidentified as `PERSON` by the lightweight NER, although this ensures high security.
- **False Negatives**: Bare company names (e.g. `Infosys`) without standard keywords like `Limited`, `Bank` or `Ltd` can be missed if they fall outside spaCy's default vocab, though this is minimized by custom context matching.

## Metrics Benchmark

- **Overall Precision**: **86.4%**
- **Overall Recall**: **90.5%**
- **Overall F1-Score**: **88.4%**

---

## Setup & Running Locally

### Backend Setup (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create virtual environment & install requirements:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Download spaCy model:
   ```bash
   pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.0/en_core_web_sm-3.7.0-py3-none-any.whl
   ```
4. Run server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start local development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to view the web application interface.
// trigger redeploy
