# app/schemas/chat.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class MessageTranslation(BaseModel):
    lang: str                  # e.g. "ru", "zh-CN"
    text: str
    autoTranslated: bool
    qualityScore: Optional[float] = None


class Message(BaseModel):
    id: str
    chatId: str
    senderId: str              # user id
    text: str
    originalLang: str          # BCP-47 code
    translations: Optional[List[MessageTranslation]] = None
    createdAt: datetime
    editedAt: Optional[datetime] = None


class MessageCreateRequest(BaseModel):
    text: str
    lang: Optional[str] = None   # if omitted, assume "ru"


class MessageTranslateRequest(BaseModel):
    targetLang: str              # e.g. "ru", "zh-CN"


class MessageTranslateResponse(BaseModel):
    text: str
    targetLang: str


class Chat(BaseModel):
    id: str
    dealId: str
    participants: List[str]      # user ids
    createdAt: datetime