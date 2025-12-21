# app/schemas/rfq_deals.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel

from .products import UnitOfMeasure, CurrencyCode


# === RFQ ===

class RFQStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    responded = "responded"
    closed = "closed"


class RFQItem(BaseModel):
    productId: Optional[str] = None
    name: str
    qty: float
    unit: UnitOfMeasure
    targetPrice: Optional[float] = None
    notes: Optional[str] = None


class RFQ(BaseModel):
    id: str
    buyerOrgId: str
    supplierOrgId: Optional[str] = None
    status: RFQStatus
    items: List[RFQItem]
    createdAt: datetime


class RFQCreateRequest(BaseModel):
    supplierOrgId: str
    items: List[RFQItem]


class RFQUpdateRequest(BaseModel):
    items: Optional[List[RFQItem]] = None


# === Offer ===

class OfferStatus(str, Enum):
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"


class OfferItem(BaseModel):
    rfqItemIndex: Optional[int] = None
    productId: Optional[str] = None
    name: str
    qty: float
    unit: UnitOfMeasure
    price: float
    subtotal: float


class Offer(BaseModel):
    id: str
    rfqId: str
    supplierOrgId: str
    status: OfferStatus
    currency: CurrencyCode
    items: List[OfferItem]
    incoterms: Optional[str] = None
    paymentTerms: Optional[str] = None
    validUntil: Optional[datetime] = None
    createdAt: datetime


class OfferCreateRequest(BaseModel):
    currency: CurrencyCode
    items: List[OfferItem]
    incoterms: Optional[str] = None
    paymentTerms: Optional[str] = None
    validUntil: Optional[datetime] = None


# === Order ===

class OrderStatus(str, Enum):
    draft = "draft"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class OrderItem(BaseModel):
    productId: Optional[str] = None
    name: str
    qty: float
    unit: UnitOfMeasure
    price: float
    subtotal: float


class Order(BaseModel):
    id: str
    buyerOrgId: str
    supplierOrgId: str
    offerId: str
    status: OrderStatus
    currency: CurrencyCode
    items: List[OrderItem]
    totalAmount: float
    createdAt: datetime


# === Deal ===

class DealStatus(str, Enum):
    negotiation = "negotiation"
    ordered = "ordered"
    paid_partially = "paid_partially"
    paid = "paid"
    closed = "closed"


class Deal(BaseModel):
    id: str
    rfqId: str
    offerId: str
    orderId: str
    status: DealStatus
    mainCurrency: CurrencyCode
    summary: Optional[dict] = None  # reserved for analytics, unit econ, etc.


class DealAggregatedView(BaseModel):
    deal: Deal
    rfq: RFQ
    offer: Offer
    order: Order