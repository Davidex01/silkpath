# app/schemas/notifications.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel


class NotificationType(str, Enum):
    message = "message"
    offer_status = "offer_status"
    order_status = "order_status"
    deal_status = "deal_status"
    payment_status = "payment_status"
    system = "system"


class NotificationEntityType(str, Enum):
    deal = "deal"
    rfq = "rfq"
    offer = "offer"
    order = "order"
    payment = "payment"
    message = "message"
    system = "system"


class Notification(BaseModel):
    id: str
    type: NotificationType
    entityType: NotificationEntityType
    entityId: str
    text: str
    data: Optional[Dict[str, Any]] = None
    read: bool
    createdAt: datetime
    readAt: Optional[datetime] = None