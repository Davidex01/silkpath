import { api } from './client';
import type { AuthState } from '../state/authTypes';

export type CurrencyCode = 'RUB' | 'CNY' | 'USD';

export interface Wallet {
  id: string;
  orgId: string;
  currency: CurrencyCode;
  balance: number;
  blockedAmount: number;
  createdAt: string;
}

/** Получить кошельки текущей организации */
export async function listWallets(auth: AuthState): Promise<Wallet[]> {
  const token = auth.tokens.accessToken;
  return api<Wallet[]>('/wallets', {}, token);
}