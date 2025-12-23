import { api } from './client';
import type { AuthState } from '../state/authTypes';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface Payment {
  id: string;
  dealId: string;
  payerOrgId: string;
  payeeOrgId: string;
  amount: number;
  currency: 'RUB' | 'CNY' | 'USD';
  status: PaymentStatus;
  fxQuoteId?: string | null;
  createdAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
}


export async function releasePayment(
  auth: AuthState,
  paymentId: string,
): Promise<Payment> {
  const token = auth.tokens.accessToken;
  return api<Payment>(
    `/payments/${paymentId}/release`,
    { method: 'POST' },
    token,
  );
}


export interface PaymentCreateInput {
  dealId: string;
  amount: number;
  currency: 'RUB' | 'CNY' | 'USD';
  fxQuoteId?: string | null;
}

/** Создать платёж (депозит в эскроу) для сделки. */
export async function createPayment(
  auth: AuthState,
  input: PaymentCreateInput,
): Promise<Payment> {
  const token = auth.tokens.accessToken;
  return api<Payment>(
    '/payments',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

/** Получить платежи по сделке. */
export async function listPaymentsForDeal(
  auth: AuthState,
  dealId: string,
): Promise<Payment[]> {
  const token = auth.tokens.accessToken;
  const params = new URLSearchParams({ dealId });
  return api<Payment[]>(`/payments?${params.toString()}`, {}, token);
}