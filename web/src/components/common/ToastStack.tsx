import React from 'react';
import { Icon } from './Icon';

export type ToastTone = 'info' | 'success' | 'warn';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 w-[360px] max-w-[90vw] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="sf-fade-in sf-card rounded-xl border border-slate-200 bg-white p-3"
        >
          <div className="flex items-start gap-3">
            <div
              className={
                'mt-0.5 rounded-lg p-2 ' +
                (t.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : t.tone === 'warn'
                  ? 'bg-orange-50 text-orange-700'
                  : 'bg-blue-50 text-blue-700')
              }
            >
              <Icon
                name={
                  t.tone === 'success'
                    ? 'check'
                    : t.tone === 'warn'
                    ? 'alert'
                    : 'spark'
                }
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">
                {t.title}
              </div>
              {t.message ? (
                <div className="mt-0.5 text-sm text-slate-600">{t.message}</div>
              ) : null}
              {t.action ? (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      try {
                        t.action?.onClick();
                      } finally {
                        onDismiss(t.id);
                      }
                    }}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    {t.action.label}
                  </button>
                </div>
              ) : null}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};