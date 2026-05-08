from fastapi import APIRouter, HTTPException
from models.schemas import FinalReportResponse, QuestionFeedbackSchema, ReportRequest
from services.report_generator import report_service

router = APIRouter(prefix="/report", tags=["Reporting"])

@router.post("/generate", response_model=FinalReportResponse)
async def generate_report(request: ReportRequest):
    """
    Fetches transcript/sentiment from DB and generates the final JSON report.
    """
    try:
        # In a full implementation, you would fetch these from Supabase/Postgres 
        # using the request.session_id 
        transcript = "Sample transcript data..." 
        sentiment_tags = ["calm", "confident"]
        
        # Use Gemini 3.1 Flash Lite with thinking level 'high'
        report = await report_service.generate_report(
            transcript=transcript, 
            sentiment_tags=sentiment_tags
        )
        
        # Map the service response to the FinalReportResponse schema
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
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")