# app/api/v1/rfq_deals.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends

from app.schemas.rfq_deals import (
    RFQ,
    RFQCreateRequest,
    RFQUpdateRequest,
    RFQStatus,
    Offer,
    OfferCreateRequest,
    OfferStatus,
    Order,
    OrderStatus,
    Deal,
    DealStatus,
    DealAggregatedView,
)
from app.services import rfq_deals as service
from app.dependencies import get_current_org_id

router = APIRouter()


# === RFQs ===


@router.get("/rfqs", response_model=List[RFQ], tags=["RFQ"])
def list_rfqs(
    role: str = Query(..., pattern="^(buyer|supplier)$"),
    status: Optional[RFQStatus] = Query(default=None),
    org_id: str = Depends(get_current_org_id),
):
    """
    List RFQs for current org as buyer or supplier.
    """
    items = service.list_rfqs(org_id, role, status)
    return items


@router.post("/rfqs", response_model=RFQ, status_code=201, tags=["RFQ"])
def create_rfq(
    payload: RFQCreateRequest,
    buyer_org_id: str = Depends(get_current_org_id),
):
    """
    Create RFQ as buyer for current organization.
    """
    rfq = service.create_rfq(buyer_org_id, payload)
    return rfq


@router.get("/rfqs/{rfq_id}", response_model=RFQ, tags=["RFQ"])
def get_rfq(rfq_id: str):
    rfq = service.get_rfq(rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@router.patch("/rfqs/{rfq_id}", response_model=RFQ, tags=["RFQ"])
def update_rfq(rfq_id: str, payload: RFQUpdateRequest):
    rfq = service.update_rfq(rfq_id, payload)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@router.post("/rfqs/{rfq_id}/send", response_model=RFQ, tags=["RFQ"])
def send_rfq(rfq_id: str):
    rfq = service.send_rfq(rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


# === Offers ===


@router.get("/rfqs/{rfq_id}/offers", response_model=List[Offer], tags=["Offers"])
def list_offers(rfq_id: str):
    rfq = service.get_rfq(rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    items = service.list_offers_for_rfq(rfq_id)
    return items


@router.post(
    "/rfqs/{rfq_id}/offers",
    response_model=Offer,
    status_code=201,
    tags=["Offers"],
)
def create_offer(
    rfq_id: str,
    payload: OfferCreateRequest,
    supplier_org_id: str = Depends(get_current_org_id),
):
    rfq = service.get_rfq(rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    # For MVP we do not restrict supplierOrgId match:
    # if rfq.supplierOrgId and rfq.supplierOrgId != supplier_org_id:
    #     raise HTTPException(status_code=403, detail="Not allowed to offer for this RFQ")

    offer = service.create_offer_for_rfq(rfq, supplier_org_id, payload)
    return offer


@router.get("/offers/{offer_id}", response_model=Offer, tags=["Offers"])
def get_offer(offer_id: str):
    offer = service.get_offer(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.post("/offers/{offer_id}/reject", response_model=Offer, tags=["Offers"])
def reject_offer(offer_id: str):
    offer = service.reject_offer(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.post("/offers/{offer_id}/accept", tags=["Offers"])
def accept_offer(offer_id: str):
    """
    Accept offer as buyer: creates Order and Deal.
    """
    res = service.accept_offer(offer_id)
    if not res:
        raise HTTPException(status_code=404, detail="Offer or RFQ not found")
    offer, order, deal = res
    return {"offer": offer, "order": order, "deal": deal}


# === Orders ===


@router.get("/orders", response_model=List[Order], tags=["Orders"])
def list_orders(
    role: str = Query(..., pattern="^(buyer|supplier)$"),
    status: Optional[OrderStatus] = Query(default=None),
    org_id: str = Depends(get_current_org_id),
):
    """
    List orders for current org as buyer or supplier.
    """
    items: List[Order] = []
    for order in service.orders.values():
        if role == "buyer" and order.buyerOrgId != org_id:
            continue
        if role == "supplier" and order.supplierOrgId != org_id:
            continue
        if status and order.status != status:
            continue
        items.append(order)
    return items


@router.get("/orders/{order_id}", response_model=Order, tags=["Orders"])
def get_order(order_id: str):
    order = service.orders.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# === Deals ===


@router.get("/deals", response_model=List[Deal], tags=["Deals"])
def list_deals(
    role: str = Query(..., pattern="^(buyer|supplier)$"),
    status: Optional[DealStatus] = Query(default=None),
    org_id: str = Depends(get_current_org_id),
):
    """
    List deals for current org as buyer or supplier.
    """
    items = service.list_deals_for_org(org_id, role, status)
    return items


@router.get("/deals/{deal_id}", response_model=DealAggregatedView, tags=["Deals"])
def get_deal(deal_id: str):
    agg = service.get_deal_aggregated(deal_id)
    if not agg:
        raise HTTPException(status_code=404, detail="Deal not found")
    return agg