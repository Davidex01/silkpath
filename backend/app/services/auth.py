# app/services/auth.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Tuple, Optional
from uuid import uuid4

from app.schemas.auth import User, AuthRegisterRequest, AuthLoginRequest
from app.schemas.orgs import Organization, OrganizationRole, KybStatus

users: Dict[str, User] = {}
orgs: Dict[str, Organization] = {}
passwords: Dict[str, str] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def register(data: AuthRegisterRequest) -> Tuple[User, Organization, dict]:
    for u in users.values():
        if u.email == data.email:
            raise ValueError("user_with_email_exists")

    org_id = str(uuid4())
    user_id = str(uuid4())

    org = Organization(
        id=org_id,
        name=data.orgName,
        country=data.orgCountry,
        role=data.orgRole,
        kybStatus=KybStatus.pending,
        createdAt=_now(),
    )

    user = User(
        id=user_id,
        email=data.email,
        name=data.name,
        phone=None,
        orgId=org_id,
        createdAt=_now(),
    )

    orgs[org_id] = org
    users[user_id] = user
    passwords[user_id] = data.password

    tokens = _make_demo_tokens(user_id)
    return user, org, tokens


def login(data: AuthLoginRequest) -> Tuple[User, Organization, dict]:
    user = next((u for u in users.values() if u.email == data.email), None)
    if not user:
        raise ValueError("invalid_credentials")

    stored_pwd = passwords.get(user.id)
    if stored_pwd != data.password:
        raise ValueError("invalid_credentials")

    org = orgs[user.orgId]  # type: ignore[arg-type]
    tokens = _make_demo_tokens(user.id)
    return user, org, tokens


def _make_demo_tokens(user_id: str) -> dict:
    return {
        "accessToken": f"demo-access-{user_id}",
        "refreshToken": f"demo-refresh-{user_id}",
        "expiresIn": 3600,
    }


def get_user_by_access_token(token: str) -> Optional[User]:
    """
    MVP: accessToken is either 'demo-access-<user_id>' or user_id.
    """
    if token.startswith("demo-access-"):
        user_id = token[len("demo-access-") :]
    else:
        user_id = token
    return users.get(user_id)