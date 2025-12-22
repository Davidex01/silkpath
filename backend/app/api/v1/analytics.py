# app/api/v1/analytics.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.analytics import DealUnitEconomicsResult
from app.services import analytics as analytics_service

router = APIRouter(tags=["Analytics"])


@router.get(
    "/analytics/deals/{deal_id}/unit-economics",
    response_model=DealUnitEconomicsResult,
)
def get_deal_unit_economics(deal_id: str):
    """
    Return unit economics summary for specific deal.
    """
    result = analytics_service.calc_deal_unit_economics(deal_id)
    if not result:
        raise HTTPException(status_code=404, detail="Deal or order not found")
    return result