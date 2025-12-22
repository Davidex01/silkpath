# app/schemas/files_docs.py
from __future__ import annotations

from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel


class File(BaseModel):
    id: str
    filename: str
    mimeType: str
    size: int  # bytes
    url: Optional[str] = None
    createdAt: datetime

class DocumentType(str, Enum):
    contract = "contract"
    purchase_order = "purchase_order"
    invoice = "invoice"
    packing_list = "packing_list"
    specification = "specification"
    other = "other"


class Document(BaseModel):
    id: str
    dealId: str
    type: DocumentType
    title: Optional[str] = None
    fileId: str
    createdAt: datetime


class DealDocumentCreateRequest(BaseModel):
    type: DocumentType
    title: Optional[str] = None
    fileId: str