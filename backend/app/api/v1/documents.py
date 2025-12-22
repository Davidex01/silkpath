# app/api/v1/documents.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.files_docs import Document, DealDocumentCreateRequest, DocumentType
from app.services import documents as docs_service

router = APIRouter(tags=["Documents"])


@router.get("/deals/{deal_id}/documents", response_model=List[Document])
def list_deal_documents(
    deal_id: str,
    type: Optional[DocumentType] = Query(default=None, description="Optional filter by type"),
):
    docs = docs_service.list_documents_for_deal(deal_id, type.value if type else None)
    # Если сделка не существует, но пока нет docs, можно решить, как обрабатывать:
    # Для MVP: если нет документов — просто пустой список.
    return docs


@router.post(
    "/deals/{deal_id}/documents",
    response_model=Document,
    status_code=201,
)
def create_deal_document(deal_id: str, payload: DealDocumentCreateRequest):
    try:
        doc = docs_service.create_document_for_deal(deal_id, payload)
    except ValueError as e:
        if str(e) == "deal_not_found":
            raise HTTPException(status_code=404, detail="Deal not found")
        raise
    return doc


@router.get("/documents/{doc_id}", response_model=Document)
def get_document(doc_id: str):
    doc = docs_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str):
    ok = docs_service.delete_document(doc_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found")
    return