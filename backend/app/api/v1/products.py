from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends

from app.schemas.products import Product, ProductCreateRequest, ProductUpdateRequest
from app.services import products as products_service
from app.dependencies import get_current_org_id

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[Product])
def list_products(
    orgId: Optional[str] = Query(default=None, description="Filter by organization ID"),
    search: Optional[str] = Query(default=None, description="Search by name/description"),
    current_org_id: str = Depends(get_current_org_id),
):
    if orgId is None:
        orgId = current_org_id
    items = products_service.list_products(orgId, search)
    return items


@router.post("", response_model=Product, status_code=201)
def create_product(
    payload: ProductCreateRequest,
    org_id: str = Depends(get_current_org_id),
):
    product = products_service.create_product(org_id, payload)
    return product