// web/src/api/analytics.ts
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
  grossMarginPct: number;
  costBreakdown: DealCostBreakdownDto;
  notes?: string | null;
}

export async function getDealUnitEconomics(
  auth: AuthState,
  dealId: string,
): Promise<DealUnitEconomicsDto> {
  return api<DealUnitEconomicsDto>(
    `/analytics/deals/${dealId}/unit-economics`,
    {},
    auth.tokens.accessToken,
  );
}