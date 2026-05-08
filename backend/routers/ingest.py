import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.schemas import IngestResponse
from services.rag_service import rag_service

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("/", response_model=IngestResponse)
async def ingest_documents(
    resume: UploadFile = File(...),
    jd: str = Form(...) # The Job Description text from the form
):
    """
    Receives PDF resume and JD, processes them through RAG, and returns a session ID.
    """
    session_id = str(uuid.uuid4())
    temp_path = f"temp_{session_id}_{resume.filename}"
    
    try:
        # 1. Save uploaded PDF temporarily
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
            
        # 2. Trigger RAG Service to chunk and embed into pgvector
        result = rag_service.process_and_store_document(
            file_path=temp_path, 
            session_id=session_id,
            doc_type="resume"
        )
        
        if result["status"] == "error":
            raise Exception(result["message"])
        
        return IngestResponse(
            session_id=session_id,
            status="success",
            message="Resume indexed. Ready for interview."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        # Cleanup temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)