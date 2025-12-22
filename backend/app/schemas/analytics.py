# app/schemas/analytics.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from .products import CurrencyCode


class DealCostBreakdown(BaseModel):
    productCost: float = 0.0
    logisticsCost: float = 0.0
    dutiesTaxes: float = 0.0
    fxCost: float = 0.0
    commissions: float = 0.0
    otherCost: float = 0.0


class DealUnitEconomicsResult(BaseModel):
    dealId: str
    currency: CurrencyCode
    revenue: float
    totalCost: float
    grossMarginAbs: float
    grossMarginPct: float
    costBreakdown: DealCostBreakdown
    notes: Optional[str] = None