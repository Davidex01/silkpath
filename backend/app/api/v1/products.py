# app/api/v1/products.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.products import Product, ProductCreateRequest, ProductUpdateRequest
from app.services import products as products_service
from app.services import auth as auth_service

router = APIRouter(prefix="/products", tags=["Products"])


def _get_current_org_id() -> str:
    # MVP: берЄм первую зарегистрированную организацию, как и в /auth/me
    if not auth_service.users:
        raise HTTPException(status_code=401, detail="Not authenticated (no users)")
    user = list(auth_service.users.values())[0]
    if not user.orgId or user.orgId not in auth_service.orgs:
        raise HTTPException(status_code=404, detail="Organization not found for user")
    return user.orgId  # type: ignore[return-value]


@router.get("", response_model=List[Product])
def list_products(
    orgId: Optional[str] = Query(default=None, description="Filter by organization ID"),
    search: Optional[str] = Query(default=None, description="Search by name/description"),
):
    """
    List products. If orgId is omitted, returns products of current user's org.
    """
    if orgId is None:
        orgId = _get_current_org_id()
    items = products_service.list_products(orgId, search)
    return items


@router.post("", response_model=Product, status_code=201)
def create_product(payload: ProductCreateRequest):
    """
    Create product for current organization.
    """
    org_id = _get_current_org_id()
    product = products_service.create_product(org_id, payload)
    return product


@router.get("/{product_id}", response_model=Product)
def get_product(product_id: str):
    product = products_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=Product)
def update_product(product_id: str, payload: ProductUpdateRequest):
    product = products_service.update_product(product_id, payload)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str):
    ok = products_service.delete_product(product_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    # 204 Ч без тела
    return