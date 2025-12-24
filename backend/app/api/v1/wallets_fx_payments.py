# app/api/v1/wallets_fx_payments.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends

from app.schemas.wallet_fx_payments import (
    Wallet,
    FXRatesResponse,
    FXQuoteRequest,
    FXQuoteResponse,
    Payment,
    PaymentCreateRequest,
    PaymentStatus,
)
from app.schemas.products import CurrencyCode
from app.services import wallets_fx as service
from app.dependencies import get_current_org_id

router = APIRouter(tags=["Wallets", "FX", "Payments"])


# === Wallets ===


@router.get("/wallets", response_model=List[Wallet])
def list_wallets(
    orgId: Optional[str] = Query(default=None),
    current_org_id: str = Depends(get_current_org_id),
):
    """
    List wallets for organization. If orgId is omitted, use current org.
    """
    if orgId is None:
        orgId = current_org_id
    items = service.list_wallets_for_org(orgId)
    return items


# === FX ===


@router.get("/fx/rates", response_model=FXRatesResponse)
def get_fx_rates(base: CurrencyCode = Query(...)):
    """
    Get current FX rates relative to base currency (MVP: static).
    """
    return service.get_fx_rates(base)


@router.post("/fx/quote", response_model=FXQuoteResponse)
def create_fx_quote(payload: FXQuoteRequest):
    """
    Get and lock FX quote for specific conversion (MVP: static rates).
    """
    return service.create_fx_quote(payload)


# === Payments ===


@router.get("/payments", response_model=List[Payment])
def list_payments(
    dealId: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None, pattern="^(payer|payee)$"),
    status: Optional[PaymentStatus] = Query(default=None),
    org_id: str = Depends(get_current_org_id),
):
    """
    List payments for current org. Can filter by role (payer/payee),
    status, and dealId.
    """
    items = service.list_payments(org_id, role, status, dealId)
    return items


@router.post("/payments", response_model=Payment, status_code=201)
def create_payment(
    payload: PaymentCreateRequest,
    org_id: str = Depends(get_current_org_id),
):
    """
    Create payment for a deal on behalf of current org (payer).
    Funds are moved from available balance to blockedAmount (escrow),
    payment status becomes 'pending'.
    """
    try:
        payment = service.create_payment(org_id, payload)
    except ValueError as e:
        msg = str(e)
        if msg == "deal_not_found":
            raise HTTPException(status_code=404, detail="Deal not found")
        if msg == "rfq_not_found":
            raise HTTPException(status_code=404, detail="Related RFQ not found")
        if msg == "insufficient_funds":
            raise HTTPException(status_code=400, detail="Insufficient funds")
        if msg == "invalid_deal_status_for_payment":
           raise HTTPException(
               status_code=400,
               detail="Deal status does not allow creating a new payment",
           )
        raise
    return payment


@router.post("/payments/{payment_id}/release", response_model=Payment)
def release_payment(payment_id: str):
    """
    Release funds from escrow to payee (completing payment).
    """
    try:
        payment = service.release_payment(payment_id)
    except ValueError as e:
        msg = str(e)
        if msg == "payment_not_found":
            raise HTTPException(status_code=404, detail="Payment not found")
        if msg == "invalid_payment_status":
            raise HTTPException(status_code=400, detail="Payment must be in 'pending' status")
        if msg == "insufficient_blocked":
            raise HTTPException(status_code=400, detail="Insufficient blocked funds")
        if msg == "deal_not_found":
           raise HTTPException(status_code=404, detail="Deal not found")
        if msg == "invalid_deal_status_for_release":
            raise HTTPException(
                status_code=400,
                detail="Deal status does not allow releasing funds",
            )
        raise
    return payment


@router.get("/payments/{payment_id}", response_model=Payment)
def get_payment(payment_id: str):
    """
    Get payment by ID.
    """
    p = service.get_payment(payment_id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return p