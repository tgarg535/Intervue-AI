import os
from typing import List
from pydantic import BaseModel, Field
from google import genai
from google.genai import types  # Use types for strict linting
from dotenv import load_dotenv

load_dotenv()

# 1. Define Structured JSON Schemas
class QuestionFeedback(BaseModel):
    question: str
    user_answer: str
    feedback: str
    technical_accuracy_score: int = Field(..., ge=0, le=10)

class InterviewReport(BaseModel):
    communication_score: int = Field(..., ge=0, le=10)
    technical_score: int = Field(..., ge=0, le=10)
    confidence_score: int = Field(..., ge=0, le=10)
    eye_contact_score: int = Field(..., ge=0, le=10)
    pace_score: int = Field(..., ge=0, le=10)
    overall_summary: str
    per_question_feedback: List[QuestionFeedback]

# 2. Initialize Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class ReportService:
    def __init__(self):
        # Using Gemini 3.1 Flash Lite for report generation
        self.model_id = "gemini-3.1-flash-lite"

    async def generate_report(self, transcript: str, sentiment_tags: List[str]) -> InterviewReport:
        """
        Analyzes session data and returns a structured report.
        """
        prompt = f"Transcript: {transcript}\nSentiment: {sentiment_tags}"

        # FIX: Use types.ThinkingConfig instead of a dictionary to clear include_thoughts error
        thinking_cfg = types.ThinkingConfig(include_thoughts=True)

        # FIX: Pass the Pydantic model directly to response_schema
        config = types.GenerateContentConfig(
            thinking_config=thinking_cfg,
            response_mime_type="application/json",
            response_schema=InterviewReport,
        )

        # Generate content
        response = client.models.generate_content(
            model=self.model_id,
            contents=prompt,
            config=config,
        )

        # FIX: If response.text is red, it's because the linter is unsure if it exists.
        # Ensure it is treated as a string.
        report_json = response.text
        if not report_json:
            raise ValueError("Gemini failed to return a report body.")

        return InterviewReport.model_validate_json(report_json)

report_service = ReportService()