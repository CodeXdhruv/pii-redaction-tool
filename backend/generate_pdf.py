import sys
import os
from fpdf import FPDF

class ComprehensivePDF(FPDF):
    def header(self):
        # Arial bold
        self.set_font('Helvetica', 'B', 15)
        # Colored title block
        self.set_text_color(26, 54, 93) # Deep Blue
        self.cell(0, 10, 'PII Detection & Redaction - Evaluation Report', border=0, ln=1, align='C')
        self.set_draw_color(226, 232, 240)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(113, 128, 150)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def chapter_title(self, label):
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(43, 108, 176) # Accent Blue
        self.cell(0, 8, label, ln=1)
        self.ln(2)

    def text_paragraph(self, text, style=''):
        self.set_font('Helvetica', style, 10)
        self.set_text_color(45, 55, 72) # Charcoal/Dark Slate
        self.multi_cell(0, 5.5, text)
        self.ln(4)

    def bullet_point(self, label, text):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(26, 54, 93)
        self.write(5, f" - {label}: ")
        self.set_font('Helvetica', '', 10)
        self.set_text_color(45, 55, 72)
        self.write(5, text + "\n")
        self.ln(1)

def generate_pdf():
    pdf = ComprehensivePDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Intro
    pdf.chapter_title("1. Executive Summary")
    pdf.text_paragraph(
        "This evaluation report documents the detection accuracy, precision, and recall metrics of the "
        "hybrid PII Redaction engine developed for document sanitization. The engine processes text "
        "and document structures (specifically Microsoft Word .docx files) by leveraging a hybrid approach: "
        "a deep-learning based Named Entity Recognition (NER) pipeline (spaCy en_core_web_sm) combined with "
        "custom high-precision regular expression recognizers tailored for structured data such as Credit Cards, "
        "IP Addresses, Social Security Numbers (SSN), and phone numbers."
    )
    
    # Evaluation Dataset
    pdf.chapter_title("2. Evaluation Methodology & Dataset")
    pdf.text_paragraph(
        "To test the accuracy of the engine, an annotated evaluation dataset consisting of 6 diverse, "
        "high-density PII passages was curated. These passages replicate typical text profiles found in "
        "official corporate reports (like the Draft Red Herring Prospectus) and system logs."
    )
    
    pdf.bullet_point("Passage 1", "Focuses on Person Names, Email Addresses, and Phone Numbers (using Indian dial code formatting).")
    pdf.bullet_point("Passage 2", "Covers Corporate/Organization Names and complex multi-line Indian physical addresses.")
    pdf.bullet_point("Passage 3", "Tests combinations of Names, Email addresses, local/public Server IP addresses, and dates.")
    pdf.bullet_point("Passage 4", "Validates structured PII extraction including Credit Card numbers, Social Security Numbers, dates, and companies.")
    pdf.bullet_point("Passage 5", "Evaluates location references and organizational identity tags.")
    pdf.bullet_point("Passage 6", "Tests network identifiers (IPs), system names, and birthdates.")
    
    pdf.ln(4)
    
    # Global Metrics
    pdf.chapter_title("3. Global Performance Results")
    pdf.text_paragraph(
        "The overall performance of the model across the benchmark is summarized below. Out of 21 ground "
        "truth PII entities, the engine correctly identified 19."
    )
    
    # Let's write the global stats
    pdf.set_fill_color(247, 250, 252)
    pdf.rect(10, pdf.get_y(), 190, 25, 'F')
    
    pdf.set_x(15)
    pdf.set_y(pdf.get_y() + 2)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(26, 54, 93)
    pdf.cell(45, 5, "Total Ground Truth: 21", ln=0)
    pdf.cell(45, 5, "True Positives (TP): 19", ln=0)
    pdf.cell(45, 5, "False Positives (FP): 3", ln=0)
    pdf.cell(45, 5, "False Negatives (FN): 2", ln=1)
    
    pdf.ln(2)
    pdf.set_x(15)
    pdf.cell(45, 5, "Global Precision: 86.36%", ln=0)
    pdf.cell(45, 5, "Global Recall: 90.48%", ln=0)
    pdf.cell(45, 5, "Global F1-Score: 88.37%", ln=1)
    pdf.ln(8)
    
    # Entity Breakdown Table
    pdf.chapter_title("4. Detailed Performance by Entity Type")
    
    # Table Header
    pdf.set_fill_color(43, 108, 176)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.cell(45, 7, "PII Entity Type", border=1, align='C', fill=True)
    pdf.cell(20, 7, "TP", border=1, align='C', fill=True)
    pdf.cell(20, 7, "FP", border=1, align='C', fill=True)
    pdf.cell(20, 7, "FN", border=1, align='C', fill=True)
    pdf.cell(28, 7, "Precision", border=1, align='C', fill=True)
    pdf.cell(28, 7, "Recall", border=1, align='C', fill=True)
    pdf.cell(28, 7, "F1-Score", border=1, align='C', fill=True)
    pdf.ln()
    
    # Table Data
    data = [
        ["Email Address", "2", "0", "0", "100%", "100%", "100%"],
        ["Phone Number", "1", "0", "0", "100%", "100%", "100%"],
        ["Physical Address", "5", "0", "0", "100%", "100%", "100%"],
        ["Social Security No.", "1", "0", "0", "100%", "100%", "100%"],
        ["Credit Card No.", "1", "0", "0", "100%", "100%", "100%"],
        ["IP Address", "2", "0", "0", "100%", "100%", "100%"],
        ["Date / DOB", "3", "1", "0", "75%", "100%", "85.7%"],
        ["Company Name", "2", "0", "1", "100%", "66.7%", "80.0%"],
        ["Full Name (Person)", "2", "2", "1", "50%", "66.7%", "57.1%"]
    ]
    
    pdf.set_text_color(45, 55, 72)
    pdf.set_font('Helvetica', '', 9)
    fill_row = False
    for row in data:
        pdf.set_fill_color(247, 250, 252) if fill_row else pdf.set_fill_color(255, 255, 255)
        pdf.cell(45, 6.5, row[0], border=1, fill=True)
        pdf.cell(20, 6.5, row[1], border=1, align='C', fill=True)
        pdf.cell(20, 6.5, row[2], border=1, align='C', fill=True)
        pdf.cell(20, 6.5, row[3], border=1, align='C', fill=True)
        pdf.cell(28, 6.5, row[4], border=1, align='C', fill=True)
        pdf.cell(28, 6.5, row[5], border=1, align='C', fill=True)
        pdf.cell(28, 6.5, row[6], border=1, align='C', fill=True)
        pdf.ln()
        fill_row = not fill_row
        
    pdf.ln(6)
    
    # Error Analysis
    pdf.chapter_title("5. Error Analysis & Failure Modes")
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(26, 54, 93)
    pdf.cell(0, 6, "5.1 False Positives (Precision Failures)", ln=1)
    pdf.text_paragraph(
        "1. Full Names: The street name 'Bapat Marg' was incorrectly flagged as a PERSON. This is a common "
        "NER model error where Indian localized road suffix keywords ('Marg' meaning street/road) behave "
        "syntactically like surnames or middle names in English corpus structures. Similarly, 'Senapati' "
        "was tagged as a LOCATION instead of being part of the address block.\n"
        "2. Dates: A standard six-digit numeric postal pin code (e.g. 400013) is occasionally captured as a date "
        "by general numerical extraction rules. Adding stricter context lookaheads reduces these issues."
    )
    
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(26, 54, 93)
    pdf.cell(0, 6, "5.2 False Negatives (Recall Failures)", ln=1)
    pdf.text_paragraph(
        "1. Brand/Company Names: The bare company name 'Infosys' (without corporate suffixes like 'Limited', "
        "'Inc.', or 'Co.') was missed by the light spaCy NER model due to vocabulary gaps. Adding dynamic "
        "entity lexicons or using standard enterprise DB lists mitigates this.\n"
        "2. Name detection: The name 'Rashi Patil' when placed within dense log output with minimal surrounding "
        "grammatical context was missed. Lightweight models rely heavily on English grammar clues (verbs, prepositions) "
        "and degrade in unstructured logs."
    )
    
    # Recommendations
    pdf.chapter_title("6. Architectural Recommendations")
    pdf.bullet_point("Contextual Validation", "Implement surrounding window scanning to verify if suspected dates or names are preceded by terms like 'PIN' or 'Zip Code'.")
    pdf.bullet_point("Transformer-based Models", "Switch from spaCy 'sm' (CPU-optimized) to transformer-based 'trf' models for higher-stake offline processing pipelines, lifting person detection F1 score above 90%.")
    pdf.bullet_point("Custom Dictionaries", "Feed a seed list of local organizations and corporate clients to the Presidio analyzer to completely eliminate brand name false negatives.")

    pdf.output("EVALUATION_REPORT.pdf")
    print("Successfully generated EVALUATION_REPORT.pdf")

if __name__ == "__main__":
    generate_pdf()
