import { api } from './client';
import type { AuthState } from '../state/authTypes';

// Должно совпасть с backend UnitOfMeasure
export type UnitOfMeasure = 'piece' | 'kg' | 'ton' | 'package' | 'm3' | 'other';

export type RFQStatus = 'draft' | 'sent' | 'responded' | 'closed';

export interface RFQItemDto {
  productId?: string | null;
  name: string;
  qty: number;
  unit: UnitOfMeasure;
  targetPrice?: number | null;
  notes?: string | null;
}

export interface RFQDto {
  id: string;
  buyerOrgId: string;
  supplierOrgId?: string | null;
  status: RFQStatus;
  items: RFQItemDto[];
  createdAt: string;
}

/** Получить RFQ для текущей организации как supplier */
export async function listSupplierRFQs(auth: AuthState): Promise<RFQDto[]> {
  const token = auth.tokens.accessToken;
  return api<RFQDto[]>('/rfqs?role=supplier', {}, token);
}