# app/schemas/files_docs.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class File(BaseModel):
    id: str
    filename: str
    mimeType: str
    size: int  # bytes
    url: Optional[str] = None
    createdAt: datetime