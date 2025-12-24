# app/services/notifications.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.schemas.notifications import (
    Notification,
    NotificationType,
    NotificationEntityType,
)
from app.services import auth as auth_service


notifications_by_user: Dict[str, List[Notification]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _push_to_user(
    user_id: str,
    type_: NotificationType,
    entity_type: NotificationEntityType,
    entity_id: str,
    text: str,
    data: Optional[dict] = None,
) -> Notification:
    notif = Notification(
        id=str(uuid4()),
        type=type_,
        entityType=entity_type,
        entityId=entity_id,
        text=text,
        data=data,
        read=False,
        createdAt=_now(),
        readAt=None,
    )
    notifications_by_user.setdefault(user_id, []).append(notif)
    return notif


def push_for_org(
    org_id: str,
    type_: NotificationType,
    entity_type: NotificationEntityType,
    entity_id: str,
    text: str,
    data: Optional[dict] = None,
) -> Optional[Notification]:
    """
    Send notification to the first user of given org.
    MVP: one user per org is enough for demo.
    """
    for u in auth_service.users.values():
        if u.orgId == org_id:
            return _push_to_user(u.id, type_, entity_type, entity_id, text, data)
    return None


def list_for_user(user_id: str, unread_only: bool = False) -> List[Notification]:
    items = notifications_by_user.get(user_id, [])
    if unread_only:
        return [n for n in items if not n.read]
    return list(items)


def mark_read(user_id: str, notif_id: str) -> Optional[Notification]:
    items = notifications_by_user.get(user_id, [])
    for n in items:
        if n.id == notif_id:
            if not n.read:
                n.read = True
                n.readAt = _now()
            return n
    return None