# app/api/v1/chats.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.schemas.chat import (
    Chat,
    Message,
    MessageCreateRequest,
    MessageTranslateRequest,
    MessageTranslateResponse,
)
from app.schemas.auth import User
from app.services import chat as chat_service
from app.dependencies import get_current_user

router = APIRouter()


# === Chats ===


@router.get("/chats", response_model=List[Chat], tags=["Chats"])
def list_chats(
    dealId: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    List chats for current user. If dealId is provided and no chat exists yet,
    auto-create a chat for this deal.
    """
    if dealId:
        # auto-create if needed
        try:
            chat_service._get_or_create_chat_for_deal(dealId, current_user.id)
        except ValueError as e:
            if str(e) == "deal_not_found":
                raise HTTPException(status_code=404, detail="Deal not found")
            raise

    items = chat_service.list_chats_for_user(current_user.id, dealId)
    return items


@router.get("/chats/{chat_id}", response_model=Chat, tags=["Chats"])
def get_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
):
    ch = chat_service.get_chat(chat_id)
    if not ch or current_user.id not in ch.participants:
        raise HTTPException(status_code=404, detail="Chat not found")
    return ch


# === Messages ===


@router.get(
    "/chats/{chat_id}/messages",
    response_model=List[Message],
    tags=["Messages"],
)
def list_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user),
):
    ch = chat_service.get_chat(chat_id)
    if not ch or current_user.id not in ch.participants:
        raise HTTPException(status_code=404, detail="Chat not found")

    msgs = chat_service.list_messages(chat_id)
    if msgs is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return msgs


@router.post(
    "/chats/{chat_id}/messages",
    response_model=Message,
    status_code=201,
    tags=["Messages"],
)
def create_message(
    chat_id: str,
    payload: MessageCreateRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        msg = chat_service.create_message(chat_id, current_user.id, payload)
    except ValueError as e:
        if str(e) == "chat_not_found":
            raise HTTPException(status_code=404, detail="Chat not found")
        raise
    return msg


@router.post(
    "/chats/{chat_id}/messages/{msg_id}/translate",
    response_model=MessageTranslateResponse,
    tags=["Messages"],
)
def translate_message(
    chat_id: str,
    msg_id: str,
    payload: MessageTranslateRequest,
    current_user: User = Depends(get_current_user),
):
    # check access
    ch = chat_service.get_chat(chat_id)
    if not ch or current_user.id not in ch.participants:
        raise HTTPException(status_code=404, detail="Chat not found")

    try:
        res = chat_service.translate_message(chat_id, msg_id, payload)
    except ValueError as e:
        msg = str(e)
        if msg == "chat_not_found" or msg == "message_not_found":
            raise HTTPException(status_code=404, detail="Message not found")
        raise
    return res