import json
from typing import List, Dict, Tuple
from backend.redactor import PIIRedactor

# Evaluation dataset: passages representing realistic paragraphs from the prospectus/ticket logs,
# containing the target PII types: Name, Email, Phone, Company, Address, SSN, Credit Card, DOB, IP.
EVALUATION_DATA = [
    {
        "text": "For questions about the IPO, contact Rashi Patil at rashhi.patil@gmail.com or call +91 9876543210.",
        "annotations": [
            {"start": 36, "end": 47, "entity_type": "PERSON", "text": "Rashi Patil"},
            {"start": 51, "end": 72, "entity_type": "EMAIL_ADDRESS", "text": "rashhi.patil@gmail.com"},
            {"start": 81, "end": 96, "entity_type": "PHONE_NUMBER", "text": "+91 9876543210"}
        ]
    },
    {
        "text": "The Lead Manager is ICICI Securities Limited, located at 162, Senapati Bapat Marg, Lower Parel, Mumbai 400013, Maharashtra.",
        "annotations": [
            {"start": 20, "end": 44, "entity_type": "ORGANIZATION", "text": "ICICI Securities Limited"},
            {"start": 57, "end": 123, "entity_type": "LOCATION", "text": "162, Senapati Bapat Marg, Lower Parel, Mumbai 400013, Maharashtra"}
        ]
    },
    {
        "text": "The auditor confirmed Rohan Dey (rohan.dey@gmail.com) verified the database server at IP 192.168.1.45 on 15-August-1994.",
        "annotations": [
            {"start": 22, "end": 31, "entity_type": "PERSON", "text": "Rohan Dey"},
            {"start": 33, "end": 52, "entity_type": "EMAIL_ADDRESS", "text": "rohan.dey@gmail.com"},
            {"start": 90, "end": 102, "entity_type": "IP_ADDRESS", "text": "192.168.1.45"},
            {"start": 106, "end": 120, "entity_type": "DATE_TIME", "text": "15-August-1994"}
        ]
    },
    {
        "text": "Billing details: Card 4111-2222-3333-4444, SSN 123-45-6789, Birth Date: 12-May-1985. Managed by Infosys.",
        "annotations": [
            {"start": 22, "end": 41, "entity_type": "CREDIT_CARD", "text": "4111-2222-3333-4444"},
            {"start": 47, "end": 58, "entity_type": "US_SSN", "text": "123-45-6789"},
            {"start": 72, "end": 83, "entity_type": "DATE_TIME", "text": "12-May-1985"},
            {"start": 96, "end": 103, "entity_type": "ORGANIZATION", "text": "Infosys"}
        ]
    },
    {
        "text": "Please send the physical document to the registered office of HDFC Bank at Senapati Bapat Marg, Mumbai.",
        "annotations": [
            {"start": 62, "end": 71, "entity_type": "ORGANIZATION", "text": "HDFC Bank"},
            {"start": 75, "end": 103, "entity_type": "LOCATION", "text": "Senapati Bapat Marg, Mumbai"}
        ]
    },
    {
        "text": "System admin logged in from 10.0.0.1 and updated the account of Priya Sharma (DOB: 24-December-1991).",
        "annotations": [
            {"start": 28, "end": 36, "entity_type": "IP_ADDRESS", "text": "10.0.0.1"},
            {"start": 64, "end": 76, "entity_type": "PERSON", "text": "Priya Sharma"},
            {"start": 83, "end": 99, "entity_type": "DATE_TIME", "text": "24-December-1991"}
        ]
    }
]

def evaluate_redactor(redactor: PIIRedactor) -> Dict:
    """
    Evaluates the redactor against the annotated evaluation dataset.
    Computes Precision, Recall, and F1-score globally and per entity type.
    """
    global_tp = 0
    global_fp = 0
    global_fn = 0
    
    entity_stats = {}
    for entity_type, label in redactor.entity_mapping.items():
        entity_stats[entity_type] = {"tp": 0, "fp": 0, "fn": 0}
        
    for item in EVALUATION_DATA:
        text = item["text"]
        annotations = item["annotations"]
        
        # Run redactor analyzer
        results = redactor.analyze_text(text)
        
        # Convert annotations to intervals
        annot_intervals = []
        for ann in annotations:
            annot_intervals.append({
                "start": ann["start"],
                "end": ann["end"],
                "type": ann["entity_type"],
                "matched": False
            })
            
        pred_intervals = []
        for res in results:
            pred_intervals.append({
                "start": res.start,
                "end": res.end,
                "type": res.entity_type,
                "matched": False
            })
            
        # Match predictions to annotations
        # We consider a match if the intervals overlap and the entity type matches
        for pred in pred_intervals:
            matched_annot = None
            for ann in annot_intervals:
                # Check overlap: max(start) < min(end)
                overlap = max(pred["start"], ann["start"]) < min(pred["end"], ann["end"])
                if overlap and pred["type"] == ann["type"]:
                    matched_annot = ann
                    break
            
            if matched_annot:
                pred["matched"] = True
                matched_annot["matched"] = True
                global_tp += 1
                entity_stats[pred["type"]]["tp"] += 1
            else:
                global_fp += 1
                if pred["type"] in entity_stats:
                    entity_stats[pred["type"]]["fp"] += 1
                    
        for ann in annot_intervals:
            if not ann["matched"]:
                global_fn += 1
                entity_stats[ann["type"]]["fn"] += 1
                
    # Calculate global metrics
    global_precision = global_tp / (global_tp + global_fp) if (global_tp + global_fp) > 0 else 0
    global_recall = global_tp / (global_tp + global_fn) if (global_tp + global_fn) > 0 else 0
    global_f1 = 2 * global_precision * global_recall / (global_precision + global_recall) if (global_precision + global_recall) > 0 else 0
    
    # Compile per-entity metrics
    entities_report = {}
    for entity_type, stats in entity_stats.items():
        tp = stats["tp"]
        fp = stats["fp"]
        fn = stats["fn"]
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        entities_report[redactor.entity_mapping[entity_type]] = {
            "TP": tp,
            "FP": fp,
            "FN": fn,
            "Precision": round(precision, 4),
            "Recall": round(recall, 4),
            "F1": round(f1, 4)
        }
        
    return {
        "global": {
            "TP": global_tp,
            "FP": global_fp,
            "FN": global_fn,
            "Precision": round(global_precision, 4),
            "Recall": round(global_recall, 4),
            "F1": round(global_f1, 4)
        },
        "entities": entities_report
    }

if __name__ == "__main__":
    redactor = PIIRedactor()
    report = evaluate_redactor(redactor)
    print(json.dumps(report, indent=2))
