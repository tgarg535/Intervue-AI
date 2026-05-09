"""
In-memory session store.
Holds transcript entries, resume text, and JD text per session.
Swap this out for Supabase/Postgres in production.
"""
from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class TranscriptEntry:
    speaker: str          # "user" | "interviewer"
    text: str
    timestamp: float = field(default_factory=time.time)
    sentiment: Optional[str] = None


@dataclass
class Session:
    session_id: str
    jd_text: str = ""
    resume_text: str = ""
    transcript: List[TranscriptEntry] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)


class SessionStore:
    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}

    # ------------------------------------------------------------------ #
    #  CRUD                                                                 #
    # ------------------------------------------------------------------ #

    def create(
        self,
        session_id: str,
        jd_text: str = "",
        resume_text: str = "",
    ) -> Session:
        session = Session(
            session_id=session_id,
            jd_text=jd_text,
            resume_text=resume_text,
        )
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    # ------------------------------------------------------------------ #
    #  Transcript helpers                                                   #
    # ------------------------------------------------------------------ #

    def add_transcript(
        self,
        session_id: str,
        speaker: str,
        text: str,
        sentiment: Optional[str] = None,
    ) -> None:
        session = self._sessions.get(session_id)
        if session and text.strip():
            session.transcript.append(
                TranscriptEntry(speaker=speaker, text=text.strip(), sentiment=sentiment)
            )

    def get_transcript_text(self, session_id: str) -> str:
        session = self._sessions.get(session_id)
        if not session:
            return ""
        lines = [
            f"{e.speaker.upper()}: {e.text}"
            for e in session.transcript
        ]
        return "\n".join(lines)

    def get_sentiment_tags(self, session_id: str) -> List[str]:
        session = self._sessions.get(session_id)
        if not session:
            return []
        return [
            e.sentiment
            for e in session.transcript
            if e.sentiment
        ]

    def get_context_block(self, session_id: str) -> str:
        """Returns JD + resume snippet to inject into Gemini system prompt."""
        session = self._sessions.get(session_id)
        if not session:
            return ""
        parts: List[str] = []
        if session.jd_text:
            parts.append(f"=== JOB DESCRIPTION ===\n{session.jd_text[:2000]}")
        if session.resume_text:
            parts.append(f"=== CANDIDATE RESUME ===\n{session.resume_text[:3000]}")
        return "\n\n".join(parts)


# Singleton used across all routers / services
session_store = SessionStore()