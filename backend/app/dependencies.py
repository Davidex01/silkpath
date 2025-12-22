# app/dependencies.py
from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.schemas.auth import User
from app.services import auth as auth_service


def get_current_user(authorization: Optional[str] = Header(default=None)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()
    user = auth_service.get_user_by_access_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def get_current_org_id(current_user: User = Depends(get_current_user)) -> str:
    if not current_user.orgId or current_user.orgId not in auth_service.orgs:
        raise HTTPException(status_code=404, detail="Organization not found for user")
    return current_user.orgId  # type: ignore[return-value]