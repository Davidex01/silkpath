# app/services/documents.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.schemas.files_docs import Document, DealDocumentCreateRequest
from app.services import rfq_deals as deals_service

documents: Dict[str, Document] = {}  # documentId -> Document


def _now() -> datetime:
    return datetime.now(timezone.utc)


def list_documents_for_deal(deal_id: str, doc_type: Optional[str] = None) -> List[Document]:
    result: List[Document] = []
    for doc in documents.values():
        if doc.dealId != deal_id:
            continue
        if doc_type and doc.type.value != doc_type:
            continue
        result.append(doc)
    return result


def create_document_for_deal(deal_id: str, payload: DealDocumentCreateRequest) -> Document:
    # ensure deal exists
    if deal_id not in deals_service.deals:
        raise ValueError("deal_not_found")

    doc_id = str(uuid4())
    doc = Document(
        id=doc_id,
        dealId=deal_id,
        type=payload.type,
        title=payload.title,
        fileId=payload.fileId,
        createdAt=_now(),
    )
    documents[doc_id] = doc
    return doc


def get_document(doc_id: str) -> Optional[Document]:
    return documents.get(doc_id)


def delete_document(doc_id: str) -> bool:
    if doc_id in documents:
        del documents[doc_id]
        return True
    return False