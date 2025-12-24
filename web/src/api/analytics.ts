import { api } from './client';
import type { AuthState } from '../state/authTypes';

export interface DealCostBreakdownDto {
    productCost: number;
    logisticsCost: number;
    dutiesTaxes: number;
    fxCost: number;
    commissions: number;
    otherCost: number;
}

export interface DealUnitEconomicsDto {
    dealId: string;
    currency: 'RUB' | 'CNY' | 'USD';
    revenue: number;
    totalCost: number;
    grossMarginAbs: number;
    grossMarginPct: number; // в процентах, как на бэке
    costBreakdown: DealCostBreakdownDto;
    notes?: string | null;
}

/** Получить unit-economics по сделке из бэка */
export async function loadDealUnitEconomics(
    auth: AuthState,
    dealId: string,
): Promise<DealUnitEconomicsDto> {
    const token = auth.tokens.accessToken;
    return api<DealUnitEconomicsDto>(
        `/analytics/deals/${dealId}/unit-economics`,
        {},
        token,
    );
}