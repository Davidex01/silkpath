# app/services/rfq_deals.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

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
    DealLogisticsState,
    OfferItem,
    OrderItem,
)
from app.schemas.products import CurrencyCode


rfqs: Dict[str, RFQ] = {}
offers: Dict[str, Offer] = {}
orders: Dict[str, Order] = {}
deals: Dict[str, Deal] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


# === RFQ ===

def create_rfq(buyer_org_id: str, payload: RFQCreateRequest) -> RFQ:
    rfq_id = str(uuid4())
    rfq = RFQ(
        id=rfq_id,
        buyerOrgId=buyer_org_id,
        supplierOrgId=payload.supplierOrgId,
        status=RFQStatus.draft,
        items=payload.items,
        createdAt=_now(),
    )
    rfqs[rfq_id] = rfq
    return rfq


def list_rfqs(org_id: str, role: str, status: Optional[RFQStatus] = None) -> List[RFQ]:
    result: List[RFQ] = []
    for rfq in rfqs.values():
        if role == "buyer" and rfq.buyerOrgId != org_id:
            continue
        if role == "supplier" and rfq.supplierOrgId != org_id:
            continue
        if status and rfq.status != status:
            continue
        result.append(rfq)
    return result


def get_rfq(rfq_id: str) -> Optional[RFQ]:
    return rfqs.get(rfq_id)


def update_rfq(rfq_id: str, payload: RFQUpdateRequest) -> Optional[RFQ]:
    rfq = rfqs.get(rfq_id)
    if not rfq:
        return None
    data = rfq.dict()
    if payload.items is not None:
        data["items"] = payload.items
    updated = RFQ(**data)
    rfqs[rfq_id] = updated
    return updated


def send_rfq(rfq_id: str) -> Optional[RFQ]:
    rfq = rfqs.get(rfq_id)
    if not rfq:
        return None
    if rfq.status not in (RFQStatus.draft, RFQStatus.responded):
        return rfq
    rfq.status = RFQStatus.sent
    rfqs[rfq_id] = rfq
    return rfq


# === Offers ===

def list_offers_for_rfq(rfq_id: str) -> List[Offer]:
    return [o for o in offers.values() if o.rfqId == rfq_id]


def create_offer_for_rfq(rfq: RFQ, supplier_org_id: str, payload: OfferCreateRequest) -> Offer:
    offer_id = str(uuid4())
    offer = Offer(
        id=offer_id,
        rfqId=rfq.id,
        supplierOrgId=supplier_org_id,
        status=OfferStatus.sent,
        currency=payload.currency,
        items=payload.items,
        incoterms=payload.incoterms,
        paymentTerms=payload.paymentTerms,
        validUntil=payload.validUntil,
        createdAt=_now(),
    )
    offers[offer_id] = offer

    # mark RFQ as responded (simplified)
    rfq.status = RFQStatus.responded
    rfqs[rfq.id] = rfq

    return offer


def get_offer(offer_id: str) -> Optional[Offer]:
    return offers.get(offer_id)


def reject_offer(offer_id: str) -> Optional[Offer]:
    offer = offers.get(offer_id)
    if not offer:
        return None
    offer.status = OfferStatus.rejected
    offers[offer_id] = offer
    return offer


# === Accept Offer -> create Order & Deal ===

def accept_offer(offer_id: str) -> Optional[tuple[Offer, Order, Deal]]:
    offer = offers.get(offer_id)
    if not offer:
        return None

    rfq = rfqs.get(offer.rfqId)
    if not rfq:
        return None

    # build order items
    order_items: List[OrderItem] = [
        OrderItem(
            productId=item.productId,
            name=item.name,
            qty=item.qty,
            unit=item.unit,
            price=item.price,
            subtotal=item.subtotal,
        )
        for item in offer.items
    ]
    total_amount = sum(i.subtotal for i in order_items)

    order_id = str(uuid4())
    order = Order(
        id=order_id,
        buyerOrgId=rfq.buyerOrgId,
        supplierOrgId=offer.supplierOrgId,
        offerId=offer.id,
        status=OrderStatus.confirmed,
        currency=offer.currency,
        items=order_items,
        totalAmount=total_amount,
        createdAt=_now(),
    )
    orders[order_id] = order

    deal_id = str(uuid4())
    deal = Deal(
        id=deal_id,
        rfqId=rfq.id,
        offerId=offer.id,
        orderId=order.id,
        status=DealStatus.ordered,
        mainCurrency=offer.currency,
        summary=None,
        logistics=DealLogisticsState(
            current="Production",
            delivered=False,
            deliveredAt=None,
        ),
    )
    deals[deal_id] = deal

    offer.status = OfferStatus.accepted
    offers[offer_id] = offer
    return offer, order, deal


# === Deals ===

def list_deals_for_org(org_id: str, role: str, status: Optional[DealStatus] = None) -> List[Deal]:
    result: List[Deal] = []
    for d in deals.values():
        rfq = rfqs.get(d.rfqId)
        if not rfq:
            continue
        if role == "buyer" and rfq.buyerOrgId != org_id:
            continue
        if role == "supplier" and rfq.supplierOrgId != org_id:
            continue
        if status and d.status != status:
            continue
        result.append(d)
    return result


def get_deal_aggregated(deal_id: str) -> Optional[DealAggregatedView]:
    d = deals.get(deal_id)
    if not d:
        return None
    rfq = rfqs.get(d.rfqId)
    offer = offers.get(d.offerId)
    order = orders.get(d.orderId)
    if not rfq or not offer or not order:
        return None
    return DealAggregatedView(deal=d, rfq=rfq, offer=offer, order=order)