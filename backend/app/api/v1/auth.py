from fastapi import APIRouter, HTTPException, Depends

from app.schemas.auth import (
    AuthRegisterRequest,
    AuthLoginRequest,
    AuthMeResponse,
    AuthResponse,
)
from app.schemas.orgs import Organization
from app.services import auth as auth_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: AuthRegisterRequest):
    try:
        user, org, tokens = auth_service.register(payload)
    except ValueError as e:
        if str(e) == "user_with_email_exists":
            raise HTTPException(status_code=400, detail="User with this email already exists")
        raise
    return {"user": user, "org": org, "tokens": tokens}


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthLoginRequest):
    try:
        user, org, tokens = auth_service.login(payload)
    except ValueError as e:
        if str(e) == "invalid_credentials":
            raise HTTPException(status_code=401, detail="Invalid credentials")
        raise
    return {"user": user, "org": org, "tokens": tokens}


@router.get("/me", response_model=AuthMeResponse)
def me(current_user = Depends(get_current_user)):
    org = auth_service.orgs.get(current_user.orgId)  # type: ignore[arg-type]
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"user": current_user, "org": org}