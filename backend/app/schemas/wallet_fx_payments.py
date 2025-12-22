# app/schemas/wallet_fx_payments.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel

from .products import CurrencyCode


class Wallet(BaseModel):
    id: str
    orgId: str
    currency: CurrencyCode
    balance: float
    blockedAmount: float = 0.0
    createdAt: datetime


class FXRatesResponse(BaseModel):
    base: CurrencyCode
    rates: Dict[str, float]
    timestamp: datetime


class FXQuoteRequest(BaseModel):
    fromCurrency: CurrencyCode
    toCurrency: CurrencyCode
    amount: float  # in fromCurrency


class FXQuoteResponse(BaseModel):
    quoteId: str
    fromCurrency: CurrencyCode
    toCurrency: CurrencyCode
    rate: float      # 1 from = rate to
    expiresAt: datetime


class PaymentStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class Payment(BaseModel):
    id: str
    dealId: str
    payerOrgId: str
    payeeOrgId: str
    amount: float
    currency: CurrencyCode
    status: PaymentStatus
    fxQuoteId: Optional[str] = None
    createdAt: datetime
    completedAt: Optional[datetime] = None
    failureReason: Optional[str] = None


class PaymentCreateRequest(BaseModel):
    dealId: str
    amount: float
    currency: CurrencyCode
    fxQuoteId: Optional[str] = None