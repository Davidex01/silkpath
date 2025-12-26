// src/modules/suppliers/SupplierDealsChatView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import type { Toast } from '../../components/common/ToastStack';
import { listSupplierDeals, type DealDto } from '../../api/deals';
import {
  getOrCreateChatForDeal,
  listChatMessagesByChatId,
  sendChatMessageToChat,
  translateMessageInChat,
  type MessageDto,
} from '../../api/chat';

interface SupplierDealsChatViewProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

// ===== Компонент подсказки =====
const HelpTip: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 grid place-items-center text-xs font-bold transition"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 left-6 top-0 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-3 sf-fade-in">
          <div className="text-xs font-bold text-slate-900 mb-1">{title}</div>
          <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
};

// ===== Компонент сообщения =====
interface ChatBubbleProps {
  isMe: boolean;
  author: string;
  text: string;
  translatedText?: string;
  ts: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  isMe,
  author,
  text,
  translatedText,
  ts,
}) => {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">{author}</span>
          <span className="text-xs text-slate-400">
            {new Date(ts).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div
          className={
            'rounded-2xl px-4 py-2.5 ' +
            (isMe
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md')
          }
        >
          <div className="text-sm">{translatedText || text}</div>
        </div>
        {translatedText && translatedText !== text && (
          <div className="mt-1 text-xs text-slate-400 italic">
            Оригинал: {text}
          </div>
        )}
      </div>
    </div>
  );
};

export const SupplierDealsChatView: React.FC<SupplierDealsChatViewProps> = ({
  auth,
  addToast,
}) => {
  const [deals, setDeals] = useState<DealDto[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  const [selectedDeal, setSelectedDeal] = useState<DealDto | null>(null);

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Загрузка сделок
  useEffect(() => {
    const loadDeals = async () => {
      try {
        setDealsLoading(true);
        setDealsError(null);
        const data = await listSupplierDeals(auth);
        setDeals(data.sort((a, b) => (a.id > b.id ? -1 : 1)));
      } catch (e) {
        console.error('Failed to load supplier deals', e);
        setDealsError('Не удалось загрузить сделки');
      } finally {
        setDealsLoading(false);
      }
    };

    void loadDeals();
  }, [auth]);

  const stats = useMemo(() => {
    const total = deals.length;
    const paid = deals.filter((d) => d.status === 'paid').length;
    const inProgress = deals.filter(
      (d) => d.status === 'ordered' || d.status === 'paid_partially',
    ).length;
    return { total, paid, inProgress };
  }, [deals]);

  // Загрузка чата при выборе сделки
  const handleSelectDeal = async (deal: DealDto) => {
    setSelectedDeal(deal);
    setMessages([]);
    setChatId(null);

    try {
      setChatLoading(true);
      const chat = await getOrCreateChatForDeal(auth, deal.id);
      setChatId(chat.id);

      const msgs = await listChatMessagesByChatId(auth, chat.id);
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to init chat for deal', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка чата',
        message: 'Не удалось загрузить историю сообщений.',
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Polling сообщений
  useEffect(() => {
    if (!chatId) return;

    const interval = setInterval(async () => {
      try {
        const msgs = await listChatMessagesByChatId(auth, chatId);
        setMessages(msgs);
      } catch (e) {
        console.error('Failed to poll messages', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [auth, chatId]);

  // Автоперевод входящих сообщений на китайский
  useEffect(() => {
    const autoTranslate = async () => {
      if (!chatId) return;

      const untranslated = messages.find((m) => {
        if (m.senderId === auth.user.id) return false;
        const hasZh = m.translations?.some((t) =>
          t.lang.toLowerCase().startsWith('zh'),
        );
        return !hasZh;
      });

      if (!untranslated) return;

      try {
        await translateMessageInChat(auth, chatId, untranslated.id, 'zh-CN');
      } catch (e) {
        console.error('Failed to auto-translate', e);
      }
    };

    void autoTranslate();
  }, [auth, chatId, messages]);

  // Отправка сообщения
  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !chatId) return;

    try {
      setSending(true);
      const msg = await sendChatMessageToChat(auth, chatId, {
        text,
        lang: 'zh-CN',
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      console.error('Failed to send message', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка отправки',
        message: 'Не удалось отправить сообщение.',
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge tone="green" icon={<Icon name="check" className="w-3 h-3" />}>
            Оплачено
          </Badge>
        );
      case 'paid_partially':
        return (
          <Badge tone="orange" icon={<Icon name="clock" className="w-3 h-3" />}>
            Частично
          </Badge>
        );
      case 'ordered':
        return (
          <Badge tone="blue" icon={<Icon name="clock" className="w-3 h-3" />}>
            Заказ
          </Badge>
        );
      case 'closed':
        return <Badge tone="gray">Закрыто</Badge>;
      default:
        return <Badge tone="gray">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="sf-card rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 grid place-items-center">
              <Icon name="deals" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Всего сделок</div>
              <div className="text-xl font-extrabold text-slate-900 sf-number">
                {stats.total}
              </div>
            </div>
          </div>
        </div>
        <div className="sf-card rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 grid place-items-center">
              <Icon name="clock" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-blue-700">В работе</div>
              <div className="text-xl font-extrabold text-blue-900 sf-number">
                {stats.inProgress}
              </div>
            </div>
          </div>
        </div>
        <div className="sf-card rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 grid place-items-center">
              <Icon name="check" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-emerald-700">Оплачено</div>
              <div className="text-xl font-extrabold text-emerald-900 sf-number">
                {stats.paid}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ===== DEALS LIST ===== */}
        <div className="xl:col-span-1">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-slate-900">Сделки</div>
                  <HelpTip title="Ваши сделки">
                    Сделки создаются после того, как покупатель принимает ваш
                    Offer. Здесь можно общаться с покупателем и отслеживать
                    статус оплаты.
                  </HelpTip>
                </div>
                <div className="text-xs text-slate-500">
                  {dealsLoading ? 'Загрузка…' : `${deals.length} сделок`}
                </div>
              </div>
            </div>

            {dealsError && (
              <div className="px-4 py-3 bg-orange-50 border-b border-orange-200">
                <div className="text-xs text-orange-700">{dealsError}</div>
              </div>
            )}

            <div className="max-h-[500px] overflow-y-auto sf-scrollbar">
              {deals.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {deals.map((deal) => {
                    const isSelected = selectedDeal?.id === deal.id;
                    return (
                      <button
                        key={deal.id}
                        onClick={() => handleSelectDeal(deal)}
                        className={
                          'w-full text-left px-4 py-3 transition ' +
                          (isSelected
                            ? 'bg-blue-50 border-l-2 border-blue-600'
                            : 'hover:bg-slate-50')
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 sf-number truncate">
                              {deal.id.slice(0, 12)}…
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {deal.mainCurrency} •{' '}
                              {deal.logistics?.current || 'Ожидание'}
                            </div>
                          </div>
                          {getStatusBadge(deal.status)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : !dealsLoading ? (
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 grid place-items-center mb-3">
                    <Icon name="deals" className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    Пока нет сделок
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Сделки появятся после принятия вашего Offer покупателем.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ===== CHAT ===== */}
        <div className="xl:col-span-2">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-[600px]">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedDeal ? 'Чат по сделке' : 'Выберите сделку'}
                  </div>
                  {selectedDeal && (
                    <div className="mt-0.5 text-xs text-slate-500">
                      ID: {selectedDeal.id.slice(0, 12)}… • {selectedDeal.mainCurrency}
                    </div>
                  )}
                </div>
                {selectedDeal && (
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">
                      Автоперевод RU→CN
                    </Badge>
                    {getStatusBadge(selectedDeal.status)}
                  </div>
                )}
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 p-4 overflow-y-auto sf-scrollbar bg-slate-50">
              {selectedDeal ? (
                chatLoading ? (
                  <div className="text-center text-xs text-slate-500">
                    Загрузка сообщений…
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((m) => {
                      const isMe = m.senderId === auth.user.id;
                      const zhTr = m.translations?.find((t) =>
                        t.lang.toLowerCase().startsWith('zh'),
                      );
                      return (
                        <ChatBubble
                          key={m.id}
                          isMe={isMe}
                          author={isMe ? 'Вы' : 'Покупатель'}
                          text={m.text}
                          translatedText={!isMe ? zhTr?.text : undefined}
                          ts={m.createdAt}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 grid place-items-center mb-3">
                      <Icon name="deals" className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      Начните диалог
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Напишите покупателю для уточнения деталей заказа.
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 grid place-items-center mb-3">
                    <Icon name="deals" className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    Выберите сделку слева
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Чат станет доступен после выбора.
                  </div>
                </div>
              )}
            </div>

            {/* Chat input */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      selectedDeal
                        ? 'Напишите сообщение… (Enter для отправки)'
                        : 'Выберите сделку для начала общения'
                    }
                    disabled={!selectedDeal}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 disabled:bg-slate-50 disabled:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => void handleSend()}
                  disabled={!selectedDeal || sending || !draft.trim()}
                  className={
                    'rounded-xl px-4 py-3 text-sm font-semibold transition ' +
                    (!selectedDeal || sending || !draft.trim()
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700')
                  }
                >
                  {sending ? '…' : 'Отправить'}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Shift+Enter для новой строки</span>
                <span className="flex items-center gap-1">
                  <Icon name="spark" className="w-3 h-3" />
                  Автоперевод включён
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== INFO CARD ===== */}
      <div className="sf-card rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-emerald-600 mt-0.5">
            <Icon name="shield" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-900">
              Защита через эскроу
            </div>
            <div className="mt-1 text-xs text-emerald-800">
              Все платежи проходят через защищённый эскроу-счёт. Вы получите
              деньги после подтверждения доставки покупателем.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};