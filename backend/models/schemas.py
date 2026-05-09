from pydantic import BaseModel, Field
from typing import List, Optional, Literal

# 1. Models for the Ingestion / Upload Phase
class IngestResponse(BaseModel):
    session_id: str
    status: str
    message: str
    storage_status: Literal["cloud", "local_fallback"] = "local_fallback"
    rag_status: str = "warning"
    warnings: List[str] = Field(default_factory=list)

# 2. Models for the Live Interview Session
class SentimentTag(BaseModel):
    """
    Matches 'sentiment tags' from the flowchart (e.g., posture_bar, sentiment_bar).
    """
    tag_type: str  # e.g., "posture", "mood", "filler_word"
    value: str     # e.g., "slouching", "anxious", "um"
    timestamp: float

class TranscriptChunk(BaseModel):
    """
    Represents a piece of the conversation to be stored in pgvector.
    """
    speaker: str  # "user" or "interviewer"
    text: str
    sentiment_data: Optional[List[SentimentTag]] = None

# 3. Models for the LangGraph State Management
class SessionStateUpdate(BaseModel):
    difficulty: int
    topic: str
    answer_quality: Optional[int] = None

# 4. Models for the Report Generation
class ReportRequest(BaseModel):
    session_id: str


class SessionPayload(BaseModel):
    session_id: str
    jd_text: str = ""
    resume_text: str = ""
    resume_url: Optional[str] = None
    jd_url: Optional[str] = None

class QuestionFeedbackSchema(BaseModel):
    question: str
    user_answer: str
    feedback: str
    technical_accuracy: int

class FinalReportResponse(BaseModel):
    """
    The structured JSON output for the Result Page.
    """
    communication_score: int
    technical_score: int
    confidence_score: int
    eye_contact_score: int
    pace_score: int
    overall_summary: str
    feedback_cards: List[QuestionFeedbackSchema]
    persisted: bool = False