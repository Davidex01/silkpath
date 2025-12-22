# app/schemas/orgs.py
from __future__ import annotations
from typing import List, Optional
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

class KYBDocumentType(str, Enum):
    registration_certificate = "registration_certificate"
    tax_certificate = "tax_certificate"
    charter = "charter"
    director_id = "director_id"
    bank_statement = "bank_statement"
    other = "other"


class KYBDocument(BaseModel):
    id: str
    type: KYBDocumentType
    fileId: str
    uploadedAt: datetime


class KYBProfile(BaseModel):
    orgId: str
    status: KybStatus
    requiredDocs: List[KYBDocumentType]
    submittedDocs: List[KYBDocument]
    lastReviewedAt: Optional[datetime] = None
    reviewerComment: Optional[str] = None


class KYBSubmitDocument(BaseModel):
    type: KYBDocumentType
    fileId: str


class KYBSubmitRequest(BaseModel):
    # basic company data are optional for now
    legalName: Optional[str] = None
    registrationNumber: Optional[str] = None
    taxId: Optional[str] = None
    address: Optional[str] = None

    documents: Optional[List[KYBSubmitDocument]] = None