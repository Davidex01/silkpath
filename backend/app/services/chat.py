# app/services/chat.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.schemas.chat import (
    Chat,
    Message,
    MessageTranslation,
    MessageCreateRequest,
    MessageTranslateRequest,
    MessageTranslateResponse,
)
from app.services import rfq_deals as deals_service
from app.services import auth as auth_service


chats: Dict[str, Chat] = {}                  # chatId -> Chat
messages_by_chat: Dict[str, List[Message]] = {}  # chatId -> [Message]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_or_create_chat_for_deal(deal_id: str, user_id: str) -> Chat:
    # Try find existing chat for deal
    for ch in chats.values():
        if ch.dealId == deal_id:
            # ensure user is in participants
            if user_id not in ch.participants:
                ch.participants.append(user_id)
            return ch

    # Ensure deal exists
    if deal_id not in deals_service.deals:
        raise ValueError("deal_not_found")

    chat_id = str(uuid4())
    chat = Chat(
        id=chat_id,
        dealId=deal_id,
        participants=[user_id],
        createdAt=_now(),
    )
    chats[chat_id] = chat
    messages_by_chat[chat_id] = []
    return chat


def list_chats_for_user(user_id: str, deal_id: Optional[str] = None) -> List[Chat]:
    result: List[Chat] = []
    for ch in chats.values():
        if user_id not in ch.participants:
            continue
        if deal_id and ch.dealId != deal_id:
            continue
        result.append(ch)
    return result


def get_chat(chat_id: str) -> Optional[Chat]:
    return chats.get(chat_id)


def list_messages(chat_id: str) -> Optional[List[Message]]:
    if chat_id not in messages_by_chat:
        return None
    return messages_by_chat[chat_id]


def create_message(
    chat_id: str,
    sender_id: str,
    payload: MessageCreateRequest,
) -> Message:
    chat = chats.get(chat_id)
    if not chat:
        raise ValueError("chat_not_found")

    if sender_id not in chat.participants:
        chat.participants.append(sender_id)

    msg_id = str(uuid4())
    original_lang = payload.lang or "ru"

    msg = Message(
        id=msg_id,
        chatId=chat_id,
        senderId=sender_id,
        text=payload.text,
        originalLang=original_lang,
        translations=None,
        createdAt=_now(),
        editedAt=None,
    )
    messages_by_chat.setdefault(chat_id, []).append(msg)
    return msg


def translate_message(
    chat_id: str,
    msg_id: str,
    payload: MessageTranslateRequest,
) -> MessageTranslateResponse:
    msgs = messages_by_chat.get(chat_id)
    if not msgs:
        raise ValueError("chat_not_found")

    msg = next((m for m in msgs if m.id == msg_id), None)
    if not msg:
        raise ValueError("message_not_found")

    # MVP auto-translation simulation
    target = payload.targetLang
    prefix = "[auto]"

    # Optional: more specific prefixes for RU/CN
    if target.lower().startswith("zh"):
        prefix = "[CN auto]"
    elif target.lower().startswith("ru"):
        prefix = "[RU auto]"

    translated_text = f"{prefix} {msg.text}"

    tr = MessageTranslation(
        lang=target,
        text=translated_text,
        autoTranslated=True,
        qualityScore=0.9,
    )

    # store in message.translations
    if msg.translations is None:
        msg.translations = []
    msg.translations.append(tr)

    return MessageTranslateResponse(text=translated_text, targetLang=target)