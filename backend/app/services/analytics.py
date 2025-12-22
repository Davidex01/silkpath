# app/services/analytics.py
from __future__ import annotations

from typing import Optional

from app.schemas.analytics import DealCostBreakdown, DealUnitEconomicsResult
from app.schemas.products import CurrencyCode
from app.services import rfq_deals as deals_service


# Shares for MVP (as fractions of revenue)
PRODUCT_SHARE = 0.7
LOGISTICS_SHARE = 0.1
DUTIES_SHARE = 0.05
FX_SHARE = 0.02
COMMISSIONS_SHARE = 0.01
OTHER_SHARE = 0.0  # we keep it 0 for now


def calc_deal_unit_economics(deal_id: str) -> Optional[DealUnitEconomicsResult]:
    deal = deals_service.deals.get(deal_id)
    if not deal:
        return None

    order = deals_service.orders.get(deal.orderId)
    if not order:
        return None

    revenue = float(order.totalAmount)
    currency: CurrencyCode = order.currency

    if revenue <= 0:
        # Degenerate case, return zeros
        breakdown = DealCostBreakdown()
        return DealUnitEconomicsResult(
            dealId=deal.id,
            currency=currency,
            revenue=0.0,
            totalCost=0.0,
            grossMarginAbs=0.0,
            grossMarginPct=0.0,
            costBreakdown=breakdown,
            notes="No revenue for this deal (totalAmount <= 0)",
        )

    product_cost = revenue * PRODUCT_SHARE
    logistics_cost = revenue * LOGISTICS_SHARE
    duties_taxes = revenue * DUTIES_SHARE
    fx_cost = revenue * FX_SHARE
    commissions = revenue * COMMISSIONS_SHARE
    other_cost = revenue * OTHER_SHARE

    total_cost = (
        product_cost + logistics_cost + duties_taxes + fx_cost + commissions + other_cost
    )
    gross_margin_abs = revenue - total_cost
    gross_margin_pct = (gross_margin_abs / revenue) * 100.0

    breakdown = DealCostBreakdown(
        productCost=product_cost,
        logisticsCost=logistics_cost,
        dutiesTaxes=duties_taxes,
        fxCost=fx_cost,
        commissions=commissions,
        otherCost=other_cost,
    )

    notes = (
        "MVP unit economics: shares applied over order.totalAmount — "
        f"product {PRODUCT_SHARE*100:.0f}%, logistics {LOGISTICS_SHARE*100:.0f}%, "
        f"duties {DUTIES_SHARE*100:.0f}%, fx {FX_SHARE*100:.0f}%, "
        f"commissions {COMMISSIONS_SHARE*100:.0f}%."
    )

    return DealUnitEconomicsResult(
        dealId=deal.id,
        currency=currency,
        revenue=revenue,
        totalCost=total_cost,
        grossMarginAbs=gross_margin_abs,
        grossMarginPct=gross_margin_pct,
        costBreakdown=breakdown,
        notes=notes,
    )