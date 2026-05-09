"""
Ingestion router.
Receives the resume PDF + JD text, runs RAG indexing (when DB is available),
and creates a session entry in the in-memory store.
"""
from __future__ import annotations

import os
import shutil
import tempfile
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models.schemas import IngestResponse
from services.rag_service import rag_service
from services.session_store import session_store
from services.storage_service import storage_service

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


@router.post("/", response_model=IngestResponse)
async def ingest_documents(
    resume: UploadFile = File(...),
    jd: str = Form(...),
) -> IngestResponse:
    """
    Receives a PDF resume and job-description text.
    1. Saves the resume temporarily and extracts its text.
    2. Indexes the text into pgvector (when DATABASE_URL is set).
    3. Creates an in-memory session so Gemini Live can access the context.
    Returns a session_id that the frontend uses for all subsequent calls.
    """
    session_id = str(uuid.uuid4())
    temp_path = os.path.join(tempfile.gettempdir(), f"resume_{session_id}.pdf")
    warnings: list[str] = []
    resume_storage_url: str | None = None
    jd_storage_url: str | None = None

    try:
        # ---------------------------------------------------------------- #
        # 1. Persist the upload temporarily                                  #
        # ---------------------------------------------------------------- #
        with open(temp_path, "wb") as buf:
            shutil.copyfileobj(resume.file, buf)
        with open(temp_path, "rb") as uploaded:
            resume_bytes = uploaded.read()

        # ---------------------------------------------------------------- #
        # 2. Extract plain text from the PDF for the in-memory context      #
        # ---------------------------------------------------------------- #
        resume_text = _extract_pdf_text(temp_path)

        if storage_service.enabled:
            resume_storage_url, resume_storage_error = await storage_service.upload_bytes(
                resume_bytes,
                f"{session_id}/resume.pdf",
                "application/pdf",
            )
            if resume_storage_error:
                warnings.append(resume_storage_error)

            jd_storage_url, jd_storage_error = await storage_service.upload_bytes(
                jd.encode("utf-8"),
                f"{session_id}/jd.txt",
                "text/plain",
            )
            if jd_storage_error:
                warnings.append(jd_storage_error)
        else:
            warnings.append("Supabase storage not configured; using local ingest fallback.")

        # ---------------------------------------------------------------- #
        # 3. Create session (always works, no DB required)                   #
        # ---------------------------------------------------------------- #
        session_store.create(
            session_id=session_id,
            jd_text=jd,
            resume_text=resume_text,
            resume_url=resume_storage_url,
            jd_url=jd_storage_url,
            metadata={"storage_enabled": storage_service.enabled},
        )

        # ---------------------------------------------------------------- #
        # 4. Index into pgvector if DATABASE_URL is configured               #
        # ---------------------------------------------------------------- #
        rag_result = rag_service.process_and_store_document(
            file_path=temp_path,
            session_id=session_id,
            doc_type="resume",
        )
        if rag_result["status"] == "error":
            # Non-fatal: log the error but continue without vector search
            print(f"[RAG] indexing skipped: {rag_result['message']}")
            warnings.append(rag_result["message"])

        return IngestResponse(
            session_id=session_id,
            status="success",
            message="Resume indexed. Ready for interview.",
            storage_status="cloud" if resume_storage_url or jd_storage_url else "local_fallback",
            rag_status=rag_result.get("status", "warning"),
            warnings=warnings,
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}") from exc

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ------------------------------------------------------------------ #
#  Helper                                                               #
# ------------------------------------------------------------------ #

def _extract_pdf_text(path: str) -> str:
    """Extract plain text from a PDF using PyMuPDF."""
    try:
        import fitz  # type: ignore[import]

        doc = fitz.open(path)
        pages = [page.get_text() for page in doc]
        return "\n".join(p for p in pages if isinstance(p, str))
    except Exception as exc:
        print(f"[Ingest] PDF text extraction failed: {exc}")
        return ""