# app/services/files.py
from __future__ import annotations

from datetime import datetime
from typing import Dict
from uuid import uuid4

from fastapi import UploadFile

from app.schemas.files_docs import File

files: Dict[str, File] = {}


def _now() -> datetime:
    return datetime.utcnow()


async def save_upload(upload: UploadFile) -> File:
    # Read content to determine size; content itself не сохраняем (MVP)
    content = await upload.read()
    size = len(content)

    file_id = str(uuid4())
    file_obj = File(
        id=file_id,
        filename=upload.filename or "file",
        mimeType=upload.content_type or "application/octet-stream",
        size=size,
        url=None,
        createdAt=_now(),
    )
    files[file_id] = file_obj
    return file_obj


def get_file(file_id: str) -> File | None:
    return files.get(file_id)