"""
In-memory session store.
Holds transcript entries, resume text, and JD text per session.
Swap this out for Supabase/Postgres in production.
"""
from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from services.persistence_service import persistence_service


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
    resume_url: Optional[str] = None
    jd_url: Optional[str] = None
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
        resume_url: Optional[str] = None,
        jd_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Session:
        session = Session(
            session_id=session_id,
            jd_text=jd_text,
            resume_text=resume_text,
            resume_url=resume_url,
            jd_url=jd_url,
        )
        self._sessions[session_id] = session
        persistence_service.create_session(
            session_id=session_id,
            jd_text=jd_text,
            resume_text=resume_text,
            resume_url=resume_url,
            jd_url=jd_url,
            metadata=metadata,
        )
        return session

    def get(self, session_id: str) -> Optional[Session]:
        local = self._sessions.get(session_id)
        if local:
            return local

        persisted = persistence_service.get_session(session_id)
        if not persisted:
            return None

        hydrated = Session(
            session_id=str(persisted["id"]),
            jd_text=persisted.get("jd_text") or "",
            resume_text=persisted.get("resume_text") or "",
            resume_url=persisted.get("resume_url"),
            jd_url=persisted.get("jd_url"),
            transcript=[],
        )
        self._sessions[session_id] = hydrated
        return hydrated

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
        if text.strip():
            if not session:
                session = self.get(session_id)
            if not session:
                return
            session.transcript.append(
                TranscriptEntry(speaker=speaker, text=text.strip(), sentiment=sentiment)
            )
            persistence_service.add_transcript_chunk(
                session_id=session_id,
                speaker=speaker,
                content=text.strip(),
                sentiment_tag=sentiment,
            )

    def get_transcript_text(self, session_id: str) -> str:
        session = self._sessions.get(session_id)
        if session and session.transcript:
            return "\n".join([f"{e.speaker.upper()}: {e.text}" for e in session.transcript])

        persisted = persistence_service.get_transcript(session_id)
        if not persisted:
            return ""
        return "\n".join(
            [f"{(entry.get('speaker') or '').upper()}: {entry.get('content') or ''}" for entry in persisted]
        )

    def get_sentiment_tags(self, session_id: str) -> List[str]:
        session = self._sessions.get(session_id)
        if session and session.transcript:
            return [e.sentiment for e in session.transcript if e.sentiment]

        persisted = persistence_service.get_transcript(session_id)
        return [str(entry.get("sentiment_tag")) for entry in persisted if entry.get("sentiment_tag")]

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