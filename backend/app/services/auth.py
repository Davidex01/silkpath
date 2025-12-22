# app/services/auth.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Tuple
from uuid import uuid4

from app.schemas.auth import User, AuthRegisterRequest, AuthLoginRequest
from app.schemas.orgs import Organization, OrganizationRole, KybStatus


# Простейшие in-memory "таблицы"
users: Dict[str, User] = {}
orgs: Dict[str, Organization] = {}
passwords: Dict[str, str] = {}  # userId -> plain password (MVP)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def register(data: AuthRegisterRequest) -> Tuple[User, Organization, dict]:
  # Проверка, что такого email ещё нет
  for u in users.values():
    if u.email == data.email:
      # В реальном мире — Typed error; здесь просто бросим исключение выше
      raise ValueError("user_with_email_exists")

  org_id = str(uuid4())
  user_id = str(uuid4())

  org = Organization(
    id=org_id,
    name=data.orgName,
    country=data.orgCountry,
    role=data.orgRole,
    kybStatus=KybStatus.pending,  # после онбординга/проверки станет verified
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
  passwords[user_id] = data.password  # WARNING: only for demo/MVP

  tokens = _make_demo_tokens(user_id)
  return user, org, tokens


def login(data: AuthLoginRequest) -> Tuple[User, Organization, dict]:
  # MVP: ищем по email, сверяем пароль из passwords
  user = next((u for u in users.values() if u.email == data.email), None)
  if not user:
    raise ValueError("invalid_credentials")

  stored_pwd = passwords.get(user.id)
  if stored_pwd != data.password:
    raise ValueError("invalid_credentials")

  org = orgs[user.orgId]  # type: ignore[call-arg]
  tokens = _make_demo_tokens(user.id)
  return user, org, tokens


def _make_demo_tokens(user_id: str) -> dict:
  # Здесь вместо реальных JWT просто возвращаем заглушки.
  # Позже можем сделать accessToken = user_id или настоящий JWT.
  return {
    "accessToken": f"demo-access-{user_id}",
    "refreshToken": f"demo-refresh-{user_id}",
    "expiresIn": 3600,
  }