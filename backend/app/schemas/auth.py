# app/schemas/auth.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from .orgs import Organization, OrganizationRole


class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    orgId: Optional[str] = None
    createdAt: datetime


class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    orgName: str
    orgCountry: str
    orgRole: OrganizationRole


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthTokens(BaseModel):
    accessToken: str
    refreshToken: str
    expiresIn: int


class AuthMeResponse(BaseModel):
    user: User
    org: Organization


class AuthResponse(BaseModel):
    user: User
    org: Organization
    tokens: AuthTokens