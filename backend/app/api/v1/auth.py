# app/api/v1/auth.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.auth import (
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthMeResponse,
  AuthTokens,
  User,
)
from app.schemas.orgs import Organization
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthMeResponse, status_code=201)
def register(payload: AuthRegisterRequest):
  """
  Регистрация пользователя и организации (MVP).

  Возвращает user, org и демо-токены.
  """
  try:
    user, org, tokens = auth_service.register(payload)
  except ValueError as e:
    if str(e) == "user_with_email_exists":
      raise HTTPException(status_code=400, detail="User with this email already exists")
    raise
  # Оборачиваем в структуру из openapi: user + org + tokens
  return {"user": user, "org": org, "tokens": tokens}


@router.post("/login", response_model=AuthMeResponse)
def login(payload: AuthLoginRequest):
  """
  Вход по email и паролю (MVP).
  """
  try:
    user, org, tokens = auth_service.login(payload)
  except ValueError as e:
    if str(e) == "invalid_credentials":
      raise HTTPException(status_code=401, detail="Invalid credentials")
    raise
  return {"user": user, "org": org, "tokens": tokens}


@router.get("/me", response_model=AuthMeResponse)
def me():
  """
  Возвращает первого зарегистрированного пользователя и его организацию.

  MVP-упрощение: позже заменим на разбор accessToken.
  """
  if not auth_service.users:
    raise HTTPException(status_code=401, detail="Not authenticated (no users registered)")
  # Берем первого пользователя
  user = list(auth_service.users.values())[0]
  org = auth_service.orgs[user.orgId]  # type: ignore[arg-type]
  return {"user": user, "org": org}