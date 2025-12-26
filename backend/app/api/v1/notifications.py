# app/api/v1/notifications.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.schemas.notifications import Notification
from app.schemas.auth import User
from app.services import notifications as notifications_service
from app.dependencies import get_current_user

router = APIRouter(tags=["Notifications"])


@router.get("/notifications", response_model=List[Notification])
def list_notifications(
    unreadOnly: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
):
    """
    List notifications for current user. If unreadOnly=true, return only unread.
    """
    items = notifications_service.list_for_user(current_user.id, unread_only=unreadOnly)
    return items


@router.post("/notifications/{notif_id}/read", response_model=Notification)
def mark_notification_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
):
    notif = notifications_service.mark_read(current_user.id, notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif