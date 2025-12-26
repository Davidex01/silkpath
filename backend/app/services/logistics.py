# app/services/logistics.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.schemas.rfq_deals import DealLogisticsState
from app.services import rfq_deals as deals_service


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_logistics_for_deal(deal_id: str) -> Optional[DealLogisticsState]:
    deal = deals_service.deals.get(deal_id)
    if not deal:
        return None
    # if not initialized (old data), create basic state
    if deal.logistics is None:
        deal.logistics = DealLogisticsState(
            current="Production",
            delivered=False,
            deliveredAt=None,
        )
        deals_service.deals[deal.id] = deal
    return deal.logistics


def simulate_delivery(deal_id: str) -> Optional[DealLogisticsState]:
    deal = deals_service.deals.get(deal_id)
    if not deal:
        return None
    state = DealLogisticsState(
        current="Delivered to warehouse",
        delivered=True,
        deliveredAt=_now(),
    )
    deal.logistics = state
    deals_service.deals[deal.id] = deal
    return state