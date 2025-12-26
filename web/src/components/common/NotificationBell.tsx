// web/src/components/common/NotificationBell.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import { Icon } from './Icon';
import {
  listNotifications,
  markNotificationRead,
  type Notification,
} from '../../api/notifications';

interface NotificationBellProps {
  auth?: AuthState;            // можно не показывать ничего, если нет auth
  pollIntervalMs?: number;     // по умолчанию 15 сек
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  auth,
  pollIntervalMs = 15000,
}) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const load = useCallback(async () => {
    if (!auth) return;
    try {
      setLoading(true);
      setError(null);
      const items = await listNotifications(auth, false);
      // Сортируем по дате
      const sorted = items
        .slice()
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      setNotifications(sorted);
    } catch (e) {
      console.error('Failed to load notifications', e);
      setError('Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!auth) return;
    const id = setInterval(() => {
      void load();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [auth, load, pollIntervalMs]);

  if (!auth) return null;

  const handleToggle = () => setOpen((v) => !v);

  const handleMarkOne = async (notif: Notification) => {
    if (notif.read) return;
    try {
      const updated = await markNotificationRead(auth, notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)),
      );
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  };

  const handleMarkAll = async () => {
    const unread = notifications.filter((n) => !n.read);
    try {
      await Promise.all(
        unread.map((n) => markNotificationRead(auth, n.id)),
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error('Failed to mark all notifications read', e);
    }
  };

  const shortTypeLabel = (n: Notification) => {
    switch (n.type) {
      case 'deal_status':
        return 'Сделка';
      case 'offer_status':
        return 'Оффер';
      case 'payment_status':
        return 'Платёж';
      case 'message':
        return 'Сообщение';
      default:
        return 'Система';
    }
  };

  return (
    <div className="relative">
      {/* Кнопка колокольчика */}
      <button
        onClick={handleToggle}
        className="relative rounded-full p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
        aria-label="Уведомления"
      >
        <Icon name="bell" className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-bold grid place-items-center px-[4px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Дропдаун */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sf-card z-40">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Уведомления
              </div>
              <div className="text-[11px] text-slate-500">
                Всего: {notifications.length} • Непрочитано: {unreadCount}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Отметить все
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto sf-scrollbar">
            {loading && (
              <div className="px-3 py-3 text-xs text-slate-500">
                Загрузка уведомлений…
              </div>
            )}
            {error && (
              <div className="px-3 py-3 text-xs text-orange-700">{error}</div>
            )}
            {!loading && notifications.length === 0 && !error && (
              <div className="px-3 py-6 text-xs text-slate-500 text-center">
                Пока нет уведомлений.
              </div>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => void handleMarkOne(n)}
                className={
                  'w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition ' +
                  (n.read ? 'bg-white' : 'bg-blue-50/40')
                }
              >
                <div className="mt-0.5">
                  <span
                    className={
                      'inline-block w-2 h-2 rounded-full ' +
                      (n.read ? 'bg-slate-300' : 'bg-blue-500')
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {shortTypeLabel(n)}
                    </span>
                    <span className="text-[10px] text-slate-400 sf-number">
                      {new Date(n.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-800 truncate">
                    {n.text}
                  </div>
                  {n.entityType && (
                    <div className="mt-0.5 text-[10px] text-slate-500 sf-number">
                      {n.entityType.toUpperCase()}:{' '}
                      {n.entityId.slice(0, 8)}…
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};