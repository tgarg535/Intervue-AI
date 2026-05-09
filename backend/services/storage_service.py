from __future__ import annotations

import os
from typing import Optional, Tuple
from uuid import uuid4

import httpx


class StorageService:
    def __init__(self) -> None:
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "intervue")
        self.enabled = bool(self.url and self.key and self.bucket)

    async def upload_bytes(
        self,
        payload: bytes,
        path_hint: str,
        content_type: str,
    ) -> Tuple[Optional[str], Optional[str]]:
        if not self.enabled:
            return None, "Supabase storage not configured."
        file_path = f"{path_hint}-{uuid4().hex}"
        endpoint = f"{self.url}/storage/v1/object/{self.bucket}/{file_path}"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(endpoint, headers=headers, content=payload)
            if resp.status_code >= 300:
                return None, f"Storage upload failed: {resp.status_code} {resp.text}"
            return f"{self.bucket}/{file_path}", None
        except Exception as exc:
            return None, f"Storage upload error: {exc}"


storage_service = StorageService()
