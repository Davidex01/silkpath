from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.schemas.orgs import (
    Organization,
    OrganizationRole,
    KYBProfile,
    KYBSubmitRequest,
    KybStatus,
)
from app.services import auth as auth_service
from app.services import orgs as orgs_service
from app.dependencies import get_current_user, get_current_org_id

router = APIRouter(prefix="/orgs", tags=["Organization"])


class OrgUpdateRequest(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    role: Optional[OrganizationRole] = None


@router.get("/me", response_model=Organization)
def get_my_org(org_id: str = Depends(get_current_org_id)):
    org = auth_service.orgs.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("/me", response_model=Organization)
def update_my_org(
    payload: OrgUpdateRequest,
    org_id: str = Depends(get_current_org_id),
):
    org = auth_service.orgs.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    data = org.dict()
    if payload.name is not None:
        data["name"] = payload.name
    if payload.country is not None:
        data["country"] = payload.country
    if payload.role is not None:
        data["role"] = payload.role

    new_org = Organization(**data)
    auth_service.orgs[new_org.id] = new_org
    return new_org


@router.get("/me/compliance", response_model=KYBProfile)
def get_my_kyb_profile(org_id: str = Depends(get_current_org_id)):
    profile = orgs_service.get_or_create_kyb_profile(org_id)
    return profile


@router.post("/me/compliance", response_model=KYBProfile)
def submit_my_kyb(
    payload: KYBSubmitRequest,
    org_id: str = Depends(get_current_org_id),
):
    profile = orgs_service.submit_kyb(org_id, payload)
    return profile


@router.get("/suppliers", response_model=list[Organization])
def list_suppliers(
    country: Optional[str] = Query(
        default=None,
        description="Filter by country ISO code, e.g. 'CN' or 'RU'",
    ),
    onlyVerified: bool = Query(
        default=False,
        description="If true, return only KYB-verified suppliers",
    ),
):
    """
    Return organizations that can act as suppliers (role=supplier or both),
    optionally filtered by country and KYB status.
    """
    result: list[Organization] = []
    for org in auth_service.orgs.values():
        if org.role not in (OrganizationRole.supplier, OrganizationRole.both):
            continue
        if country and org.country != country:
            continue
        if onlyVerified and org.kybStatus != KybStatus.verified:
            continue
        result.append(org)
    return result