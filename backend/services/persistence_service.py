from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row


@dataclass
class PersistenceStatus:
    enabled: bool
    reason: str = ""


class PersistenceService:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "").strip()
        self._status = PersistenceStatus(
            enabled=bool(self.database_url),
            reason="" if self.database_url else "DATABASE_URL not configured.",
        )

    @property
    def status(self) -> PersistenceStatus:
        return self._status

    def _connect(self) -> psycopg.Connection:
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is not configured.")
        return psycopg.connect(self.database_url, row_factory=dict_row)

    def create_session(
        self,
        session_id: str,
        jd_text: str,
        resume_text: str,
        resume_url: Optional[str],
        jd_url: Optional[str],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        if not self.status.enabled:
            return False
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO sessions (id, jd_text, resume_url, jd_url, resume_text, metadata)
                        VALUES (%s::uuid, %s, %s, %s, %s, %s::jsonb)
                        ON CONFLICT (id) DO UPDATE
                        SET jd_text = EXCLUDED.jd_text,
                            resume_url = EXCLUDED.resume_url,
                            jd_url = EXCLUDED.jd_url,
                            resume_text = EXCLUDED.resume_text,
                            metadata = EXCLUDED.metadata
                        """,
                        (
                            session_id,
                            jd_text,
                            resume_url,
                            jd_url,
                            resume_text,
                            json.dumps(metadata or {}),
                        ),
                    )
            return True
        except Exception as exc:
            print(f"[Persistence] create_session failed: {exc}")
            return False

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if not self.status.enabled:
            return None
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, jd_text, resume_text, resume_url, jd_url, created_at, metadata
                        FROM sessions
                        WHERE id = %s::uuid
                        """,
                        (session_id,),
                    )
                    return cur.fetchone()
        except Exception as exc:
            print(f"[Persistence] get_session failed: {exc}")
            return None

    def add_transcript_chunk(
        self,
        session_id: str,
        speaker: str,
        content: str,
        sentiment_tag: Optional[str],
        extras: Optional[Dict[str, Any]] = None,
    ) -> bool:
        if not self.status.enabled or not content.strip():
            return False
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO transcript_chunks (session_id, speaker, content, sentiment_tag, extras)
                        VALUES (%s::uuid, %s, %s, %s, %s::jsonb)
                        """,
                        (session_id, speaker, content.strip(), sentiment_tag, json.dumps(extras or {})),
                    )
            return True
        except Exception as exc:
            print(f"[Persistence] add_transcript_chunk failed: {exc}")
            return False

    def get_transcript(self, session_id: str) -> List[Dict[str, Any]]:
        if not self.status.enabled:
            return []
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT speaker, content, sentiment_tag, created_at, extras
                        FROM transcript_chunks
                        WHERE session_id = %s::uuid
                        ORDER BY created_at ASC, id ASC
                        """,
                        (session_id,),
                    )
                    return cur.fetchall()
        except Exception as exc:
            print(f"[Persistence] get_transcript failed: {exc}")
            return []

    def save_report(
        self,
        session_id: str,
        report_payload: Dict[str, Any],
    ) -> bool:
        if not self.status.enabled:
            return False
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO reports (
                            session_id,
                            communication_score,
                            technical_score,
                            confidence_score,
                            eye_contact_score,
                            pace_score,
                            overall_summary,
                            feedback_json
                        )
                        VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s::jsonb)
                        ON CONFLICT (session_id) DO UPDATE
                        SET communication_score = EXCLUDED.communication_score,
                            technical_score = EXCLUDED.technical_score,
                            confidence_score = EXCLUDED.confidence_score,
                            eye_contact_score = EXCLUDED.eye_contact_score,
                            pace_score = EXCLUDED.pace_score,
                            overall_summary = EXCLUDED.overall_summary,
                            feedback_json = EXCLUDED.feedback_json,
                            created_at = NOW()
                        """,
                        (
                            session_id,
                            report_payload.get("communication_score", 0),
                            report_payload.get("technical_score", 0),
                            report_payload.get("confidence_score", 0),
                            report_payload.get("eye_contact_score", 0),
                            report_payload.get("pace_score", 0),
                            report_payload.get("overall_summary", ""),
                            json.dumps(report_payload.get("feedback_cards", [])),
                        ),
                    )
            return True
        except Exception as exc:
            print(f"[Persistence] save_report failed: {exc}")
            return False


persistence_service = PersistenceService()
