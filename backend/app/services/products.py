# app/services/products.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.schemas.products import Product, ProductCreateRequest, ProductUpdateRequest


products: Dict[str, Product] = {}  # productId -> Product


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_product(org_id: str, payload: ProductCreateRequest) -> Product:
    product_id = str(uuid4())
    product = Product(
        id=product_id,
        orgId=org_id,
        name=payload.name,
        description=payload.description,
        hsCode=payload.hsCode,
        baseCurrency=payload.baseCurrency,
        basePrice=payload.basePrice,
        unit=payload.unit,
        createdAt=_now(),
    )
    products[product_id] = product
    return product


def list_products(org_id: Optional[str] = None, search: Optional[str] = None) -> List[Product]:
    items = list(products.values())
    if org_id:
        items = [p for p in items if p.orgId == org_id]
    if search:
        s = search.lower()
        items = [
            p
            for p in items
            if s in p.name.lower() or (p.description and s in p.description.lower())
        ]
    return items


def get_product(product_id: str) -> Optional[Product]:
    return products.get(product_id)


def update_product(product_id: str, payload: ProductUpdateRequest) -> Optional[Product]:
    product = products.get(product_id)
    if not product:
        return None

    data = product.dict()
    for field, value in payload.dict(exclude_unset=True).items():
        data[field] = value

    updated = Product(**data)
    products[product_id] = updated
    return updated


def delete_product(product_id: str) -> bool:
    if product_id in products:
        del products[product_id]
        return True
    return False