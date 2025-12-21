# app/schemas/orgs.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class OrganizationRole(str, Enum):
  buyer = "buyer"
  supplier = "supplier"
  both = "both"


class KybStatus(str, Enum):
  not_started = "not_started"
  pending = "pending"
  verified = "verified"
  rejected = "rejected"


class Organization(BaseModel):
  id: str
  name: str
  country: str  # ISO code, e.g. "RU", "CN"
  role: OrganizationRole
  kybStatus: KybStatus
  createdAt: datetime