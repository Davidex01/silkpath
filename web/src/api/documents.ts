import { api } from './client';
import type { AuthState } from '../state/authTypes';

export type DocumentType =
  | 'contract'
  | 'purchase_order'
  | 'invoice'
  | 'packing_list'
  | 'specification'
  | 'other';

export interface Document {
  id: string;
  dealId: string;
  type: DocumentType;
  title?: string | null;
  fileId: string;
  createdAt: string;
}

/** Получить документы по сделке */
export async function listDealDocuments(
  auth: AuthState,
  dealId: string,
  type?: DocumentType,
): Promise<Document[]> {
  const token = auth.tokens.accessToken;
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  const path =
    params.toString().length > 0
      ? `/deals/${dealId}/documents?${params.toString()}`
      : `/deals/${dealId}/documents`;
  return api<Document[]>(path, {}, token);
}

/** Создать документ для сделки (без реального файла, пока заглушка) */
export async function createDealDocument(
  auth: AuthState,
  dealId: string,
  input: { type: DocumentType; title?: string | null; fileId: string },
): Promise<Document> {
  const token = auth.tokens.accessToken;
  return api<Document>(
    `/deals/${dealId}/documents`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}