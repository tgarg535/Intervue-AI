"""
Report router.
Fetches the stored transcript + sentiment from the session store,
calls the Gemini report service, and returns the structured JSON.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import FinalReportResponse, QuestionFeedbackSchema, ReportRequest
from services.report_generator import report_service
from services.session_store import session_store

router = APIRouter(prefix="/report", tags=["Reporting"])


@router.post("/generate", response_model=FinalReportResponse)
async def generate_report(request: ReportRequest) -> FinalReportResponse:
    """
    Generates the final performance report for a completed interview session.
    Requires a valid session_id returned by POST /ingest/.
    """
    session = session_store.get(request.session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{request.session_id}' not found. "
                   "Ensure the session was created via POST /ingest/ and has not expired.",
        )

    transcript = session_store.get_transcript_text(request.session_id)
    sentiment_tags = session_store.get_sentiment_tags(request.session_id)

    try:
        report = await report_service.generate_report(
            transcript=transcript,
            sentiment_tags=sentiment_tags,
            jd_text=session.jd_text,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {exc}",
        ) from exc

    return FinalReportResponse(
        communication_score=report.communication_score,
        technical_score=report.technical_score,
        confidence_score=report.confidence_score,
        eye_contact_score=report.eye_contact_score,
        pace_score=report.pace_score,
        overall_summary=report.overall_summary,
        feedback_cards=[
            QuestionFeedbackSchema(
                question=f.question,
                user_answer=f.user_answer,
                feedback=f.feedback,
                technical_accuracy=f.technical_accuracy_score,
            )
            for f in report.per_question_feedback
        ],
    )


@router.get("/session/{session_id}/transcript")
async def get_transcript(session_id: str) -> dict:
    """
    Debug endpoint: returns the raw stored transcript for a session.
    """
    session = session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "transcript": session_store.get_transcript_text(session_id),
        "entry_count": len(session.transcript),
    }