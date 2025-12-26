# app/api/v1/logistics.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.rfq_deals import DealLogisticsState
from app.services import logistics as logistics_service

router = APIRouter(tags=["Logistics"])


@router.get("/deals/{deal_id}/logistics", response_model=DealLogisticsState)
def get_deal_logistics(deal_id: str):
    """
    Return current logistics state for given deal.
    """
    state = logistics_service.get_logistics_for_deal(deal_id)
    if not state:
        raise HTTPException(status_code=404, detail="Deal not found")
    return state


@router.post("/deals/{deal_id}/logistics/simulate", response_model=DealLogisticsState)
def simulate_deal_delivery(deal_id: str):
    """
    Simulate delivery completion: mark deal as delivered to warehouse.
    """
    state = logistics_service.simulate_delivery(deal_id)
    if not state:
        raise HTTPException(status_code=404, detail="Deal not found")
    return state