# app/services/wallets_fx.py
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import uuid4

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
from app.schemas.rfq_deals import DealStatus
from app.services import auth as auth_service
from app.services import rfq_deals as deals_service


wallets: Dict[str, Wallet] = {}
payments: Dict[str, Payment] = {}
fx_quotes: Dict[str, FXQuoteResponse] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_wallet(org_id: str, currency: CurrencyCode) -> Wallet:
    for w in wallets.values():
        if w.orgId == org_id and w.currency == currency:
            return w
    # Create new wallet with demo balance
    initial_balance = 1_000_000.0 if currency == CurrencyCode.RUB else 0.0
    wallet = Wallet(
        id=str(uuid4()),
        orgId=org_id,
        currency=currency,
        balance=initial_balance,
        blockedAmount=0.0,
        createdAt=_now(),
    )
    wallets[wallet.id] = wallet
    return wallet


def list_wallets_for_org(org_id: Optional[str] = None) -> List[Wallet]:
    if org_id is None:
        return list(wallets.values())
    return [w for w in wallets.values() if w.orgId == org_id]


# === FX ===


def get_fx_rates(base: CurrencyCode) -> FXRatesResponse:
    # MVP static rates
    if base == CurrencyCode.RUB:
        rates = {"CNY": 0.075, "USD": 0.01}
    elif base == CurrencyCode.CNY:
        rates = {"RUB": 13.3, "USD": 0.133}
    else:  # USD
        rates = {"RUB": 100.0, "CNY": 7.5}
    return FXRatesResponse(base=base, rates=rates, timestamp=_now())


def create_fx_quote(payload: FXQuoteRequest) -> FXQuoteResponse:
    rates = get_fx_rates(payload.fromCurrency)
    target = payload.toCurrency.value
    rate = rates.rates.get(target, 1.0)
    quote = FXQuoteResponse(
        quoteId=str(uuid4()),
        fromCurrency=payload.fromCurrency,
        toCurrency=payload.toCurrency,
        rate=rate,
        expiresAt=_now() + timedelta(minutes=15),
    )
    fx_quotes[quote.quoteId] = quote
    return quote


# === Payments / Escrow demo ===


def create_payment(current_org_id: str, payload: PaymentCreateRequest) -> Payment:
    deal = deals_service.deals.get(payload.dealId)
    if not deal:
        raise ValueError("deal_not_found")

    rfq = deals_service.rfqs.get(deal.rfqId)
    if not rfq:
        raise ValueError("rfq_not_found")

    payer_org_id = current_org_id
    if payer_org_id == rfq.buyerOrgId:
        payee_org_id = rfq.supplierOrgId or payer_org_id
    else:
        payee_org_id = rfq.buyerOrgId

    # Ensure wallets
    payer_wallet = _ensure_wallet(payer_org_id, payload.currency)
    _ = _ensure_wallet(payee_org_id, payload.currency)  # ensure exists

    # Check balance
    if payer_wallet.balance < payload.amount:
        raise ValueError("insufficient_funds")

    # Move from available balance to blockedAmount (escrow)
    payer_wallet.balance -= payload.amount
    payer_wallet.blockedAmount += payload.amount
    wallets[payer_wallet.id] = payer_wallet

    payment_id = str(uuid4())
    payment = Payment(
        id=payment_id,
        dealId=payload.dealId,
        payerOrgId=payer_org_id,
        payeeOrgId=payee_org_id,
        amount=payload.amount,
        currency=payload.currency,
        status=PaymentStatus.pending,
        fxQuoteId=payload.fxQuoteId,
        createdAt=_now(),
        completedAt=None,
        failureReason=None,
    )
    payments[payment_id] = payment

    # Update deal status to reflect partial payment (deposit to escrow)
    deal.status = DealStatus.paid_partially
    deals_service.deals[deal.id] = deal

    return payment


def release_payment(payment_id: str) -> Payment:
    """
    Release funds from escrow to payee.
    """
    payment = payments.get(payment_id)
    if not payment:
        raise ValueError("payment_not_found")

    if payment.status != PaymentStatus.pending:
        raise ValueError("invalid_payment_status")

    # Fetch wallets
    payer_wallet = _ensure_wallet(payment.payerOrgId, payment.currency)
    payee_wallet = _ensure_wallet(payment.payeeOrgId, payment.currency)

    if payer_wallet.blockedAmount < payment.amount:
        raise ValueError("insufficient_blocked")

    # Move from blocked to payee balance
    payer_wallet.blockedAmount -= payment.amount
    wallets[payer_wallet.id] = payer_wallet

    payee_wallet.balance += payment.amount
    wallets[payee_wallet.id] = payee_wallet

    payment.status = PaymentStatus.completed
    payment.completedAt = _now()
    payments[payment.id] = payment

    # Mark deal as fully paid (MVP)
    deal = deals_service.deals.get(payment.dealId)
    if deal:
        deal.status = DealStatus.paid
        deals_service.deals[deal.id] = deal

    return payment


def list_payments(
    org_id: str,
    role: Optional[str] = None,
    status: Optional[PaymentStatus] = None,
    deal_id: Optional[str] = None,
) -> List[Payment]:
    result: List[Payment] = []
    for p in payments.values():
        if deal_id and p.dealId != deal_id:
            continue
        if role == "payer" and p.payerOrgId != org_id:
            continue
        if role == "payee" and p.payeeOrgId != org_id:
            continue
        if status and p.status != status:
            continue
        result.append(p)
    return result


def get_payment(payment_id: str) -> Optional[Payment]:
    return payments.get(payment_id)