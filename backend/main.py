import os
import base64
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.redactor import PIIRedactor
from backend.evaluator import evaluate_redactor

app = FastAPI(title="PII Redaction API", version="1.0.0")

# Enable CORS for the Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the redactor
# We will download the spaCy model during setup; if en_core_web_sm is not loaded,
# we fallback or load it on demand.
try:
    redactor = PIIRedactor(spacy_model="en_core_web_sm")
except Exception as e:
    print(f"Error initializing PIIRedactor: {e}. Model might not be downloaded yet.")
    redactor = None

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "spacy_loaded": redactor is not None}

@app.post("/api/redact")
async def redact_file(file: UploadFile = File(...)):
    global redactor
    if redactor is None:
        try:
            redactor = PIIRedactor(spacy_model="en_core_web_sm")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Redactor engine not initialized: {e}")

    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    # Read uploaded file into a temporary file
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_in:
            content = await file.read()
            temp_in.write(content)
            temp_in_path = temp_in.name

        # Prepare temporary output file path
        temp_out_path = temp_in_path.replace(suffix, f"_redacted{suffix}")

        # Perform redaction
        stats = redactor.redact_document(temp_in_path, temp_out_path)

        # Read redacted file bytes and encode to base64
        with open(temp_out_path, "rb") as f:
            redacted_bytes = f.read()
            redacted_b64 = base64.b64encode(redacted_bytes).decode("utf-8")

        # Clean up temporary files
        os.remove(temp_in_path)
        os.remove(temp_out_path)

        return {
            "success": True,
            "filename": f"Redacted_{file.filename}",
            "stats": stats,
            "redacted_file_base64": redacted_b64
        }

    except Exception as e:
        # Clean up files in case of error
        try:
            if 'temp_in_path' in locals() and os.path.exists(temp_in_path):
                os.remove(temp_in_path)
            if 'temp_out_path' in locals() and os.path.exists(temp_out_path):
                os.remove(temp_out_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/evaluate")
def run_evaluation():
    global redactor
    if redactor is None:
        try:
            redactor = PIIRedactor(spacy_model="en_core_web_sm")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Redactor engine not initialized: {e}")
            
    try:
        report = evaluate_redactor(redactor)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")
