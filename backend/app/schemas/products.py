# app/schemas/products.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class CurrencyCode(str, Enum):
    RUB = "RUB"
    CNY = "CNY"
    USD = "USD"


class UnitOfMeasure(str, Enum):
    piece = "piece"
    kg = "kg"
    ton = "ton"
    package = "package"
    m3 = "m3"
    other = "other"


class Product(BaseModel):
    id: str
    orgId: str
    name: str
    description: Optional[str] = None
    hsCode: Optional[str] = None
    baseCurrency: CurrencyCode
    basePrice: float
    unit: UnitOfMeasure
    createdAt: datetime


class ProductCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    hsCode: Optional[str] = None
    baseCurrency: CurrencyCode
    basePrice: float
    unit: UnitOfMeasure


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hsCode: Optional[str] = None
    baseCurrency: Optional[CurrencyCode] = None
    basePrice: Optional[float] = None
    unit: Optional[UnitOfMeasure] = None