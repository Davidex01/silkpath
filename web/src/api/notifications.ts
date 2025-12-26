// web/src/api/notifications.ts
import { api } from './client';
import type { AuthState } from '../state/authTypes';

export type NotificationType =
  | 'message'
  | 'offer_status'
  | 'order_status'
  | 'deal_status'
  | 'payment_status'
  | 'system';

export type NotificationEntityType =
  | 'deal'
  | 'rfq'
  | 'offer'
  | 'order'
  | 'payment'
  | 'message'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  text: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
}

/** Список уведомлений для текущего пользователя */
export async function listNotifications(
  auth: AuthState,
  unreadOnly = false,
): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set('unreadOnly', 'true');
  const path =
    params.toString().length > 0
      ? `/notifications?${params.toString()}`
      : '/notifications';

  return api<Notification[]>(path, {}, auth.tokens.accessToken);
}

/** Отметить уведомление прочитанным */
export async function markNotificationRead(
  auth: AuthState,
  notifId: string,
): Promise<Notification> {
  return api<Notification>(
    `/notifications/${notifId}/read`,
    { method: 'POST' },
    auth.tokens.accessToken,
  );
}