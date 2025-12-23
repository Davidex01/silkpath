import { api } from './client';
import type { AuthState } from '../state/authTypes';

export interface DealLogisticsStateDto {
  current: string;
  delivered: boolean;
  deliveredAt: string | null;
}

export async function getDealLogistics(
  auth: AuthState,
  dealId: string,
): Promise<DealLogisticsStateDto> {
  const token = auth.tokens.accessToken;
  return api<DealLogisticsStateDto>(`/deals/${dealId}/logistics`, {}, token);
}

export async function simulateDealDelivery(
  auth: AuthState,
  dealId: string,
): Promise<DealLogisticsStateDto> {
  const token = auth.tokens.accessToken;
  return api<DealLogisticsStateDto>(
    `/deals/${dealId}/logistics/simulate`,
    { method: 'POST' },
    token,
  );
}