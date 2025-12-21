# app/api/v1/orgs.py
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas.orgs import (
    Organization,
    OrganizationRole,
    KYBProfile,
    KYBSubmitRequest,
)

from app.services import auth as auth_service
from app.services import orgs as orgs_service

router = APIRouter(prefix="/orgs", tags=["Organization"])


class OrgUpdateRequest(BaseModel):
  name: Optional[str] = None
  country: Optional[str] = None
  role: Optional[OrganizationRole] = None


def _get_first_user_and_org():
  if not auth_service.users:
    raise HTTPException(status_code=401, detail="Not authenticated (no users)")
  user = list(auth_service.users.values())[0]
  if not user.orgId or user.orgId not in auth_service.orgs:
    raise HTTPException(status_code=404, detail="Organization not found for user")
  org = auth_service.orgs[user.orgId]
  return user, org


@router.get("/me", response_model=Organization)
def get_my_org():
  """
  Возвращает организацию текущего пользователя (MVP: первого в памяти).
  """
  _, org = _get_first_user_and_org()
  return org


@router.patch("/me", response_model=Organization)
def update_my_org(payload: OrgUpdateRequest):
  """
  Обновление полей name/country/role для своей организации.
  """
  _, org = _get_first_user_and_org()
  updated_data = org.dict()

  if payload.name is not None:
    updated_data["name"] = payload.name
  if payload.country is not None:
    updated_data["country"] = payload.country
  if payload.role is not None:
    updated_data["role"] = payload.role

  new_org = Organization(**updated_data)
  auth_service.orgs[new_org.id] = new_org
  return new_org

@router.get("/me/compliance", response_model=KYBProfile)
def get_my_kyb_profile():
    """
    Return KYB profile for current user's organization (create if missing).
    """
    _, org = _get_first_user_and_org()
    profile = orgs_service.get_or_create_kyb_profile(org.id)
    return profile


@router.post("/me/compliance", response_model=KYBProfile)
def submit_my_kyb(payload: KYBSubmitRequest):
    """
    Submit/update KYB info for current user's organization.
    """
    _, org = _get_first_user_and_org()
    profile = orgs_service.submit_kyb(org.id, payload)
    return profile