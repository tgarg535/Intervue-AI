"""
Report generator.
Uses gemini-2.0-flash with structured JSON output to produce
the final interview assessment from raw transcript + sentiment data.
"""
from __future__ import annotations

import os
from typing import List

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

load_dotenv()


# ------------------------------------------------------------------ #
#  Structured output schemas                                            #
# ------------------------------------------------------------------ #

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


# ------------------------------------------------------------------ #
#  Service                                                              #
# ------------------------------------------------------------------ #

class ReportService:
    # gemini-2.0-flash supports thinking and structured JSON output
    MODEL_ID = "gemini-3.1-flash-lite"

    def __init__(self) -> None:
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
        self.client = genai.Client(api_key=api_key)

    async def generate_report(
        self,
        transcript: str,
        sentiment_tags: List[str],
        jd_text: str = "",
    ) -> InterviewReport:
        """
        Analyses the full session transcript and returns a structured report.
        Falls back to a dummy report when no API key is configured.
        """
        if not transcript.strip():
            return self._empty_report()

        sentiment_str = ", ".join(sentiment_tags) if sentiment_tags else "no data"
        jd_block = f"\n\n=== JOB DESCRIPTION ===\n{jd_text[:1500]}" if jd_text else ""

        prompt = (
            "You are an expert technical interviewer evaluating a candidate's performance.\n"
            "Analyse the following interview transcript carefully and return a structured JSON report.\n\n"
            f"=== TRANSCRIPT ===\n{transcript}\n\n"
            f"=== SENTIMENT OBSERVATIONS ===\n{sentiment_str}"
            f"{jd_block}\n\n"
            "Evaluate the candidate on ALL of the following dimensions (0–10):\n"
            "- communication_score: clarity, structure, vocabulary\n"
            "- technical_score: correctness, depth, terminology\n"
            "- confidence_score: assertiveness, avoidance of hedging\n"
            "- eye_contact_score: inferred from sentiment/posture tags (default 7 if no data)\n"
            "- pace_score: speaking rate inferred from transcript density\n\n"
            "Also produce:\n"
            "- overall_summary: 2–3 sentence executive assessment\n"
            "- per_question_feedback: for EACH distinct question in the transcript, provide "
            "the question, a paraphrase of the user's answer, constructive feedback, "
            "and a technical_accuracy_score (0–10)\n\n"
            "Return ONLY valid JSON. No markdown, no explanation, no preamble."
        )

        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=1024),
            response_mime_type="application/json",
            response_schema=InterviewReport,
        )

        try:
            response = self.client.models.generate_content(
                model=self.MODEL_ID,
                contents=prompt,
                config=config,
            )
            report_json = response.text
            if not report_json:
                raise ValueError("Empty response from Gemini")
            return InterviewReport.model_validate_json(report_json)

        except Exception as exc:
            print(f"[Report] generation error: {exc}")
            # Return a graceful fallback so the UI doesn't crash
            return self._empty_report(
                summary=(
                    "Report generation encountered an error. "
                    "Please ensure your GOOGLE_API_KEY is configured and try again."
                )
            )

    @staticmethod
    def _empty_report(summary: str = "Interview completed. No transcript data available.") -> InterviewReport:
        return InterviewReport(
            communication_score=0,
            technical_score=0,
            confidence_score=0,
            eye_contact_score=0,
            pace_score=0,
            overall_summary=summary,
            per_question_feedback=[],
        )


report_service = ReportService()