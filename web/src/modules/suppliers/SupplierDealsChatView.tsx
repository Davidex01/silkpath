// web/src/modules/supplier/SupplierDealsChatView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import { listSupplierDeals, type DealDto } from '../../api/deals';
import {
  getOrCreateChatForDeal,
  listChatMessagesByChatId,
  sendChatMessageToChat,
  translateMessageInChat,
  type MessageDto,
} from '../../api/chat';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import type { Toast } from '../../components/common/ToastStack';

interface SupplierDealsChatViewProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

type BadgeTone = 'gray' | 'blue' | 'green' | 'orange';
type ChatSide = 'left' | 'right';

interface ChatBubbleProps {
  side: ChatSide;
  author: string;
  text: string;
  subText?: string;
  ts: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  side,
  author,
  text,
  subText,
  ts,
}) => {
  const align = side === 'left' ? 'items-start' : 'items-end';
  const bubble =
    side === 'left'
      ? 'bg-white text-slate-900 ring-slate-200'
      : 'bg-[var(--sf-blue-900)] text-white ring-blue-950/30';

  return (
    <div className={`flex ${align} gap-2`}>
      <div className="max-w-[80%]">
        <div className="text-[11px] text-slate-500 mb-0.5">
          {author} •{' '}
          {new Date(ts).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ring-1 ring-inset ${bubble}`}
        >
          {text}
        </div>
        {subText ? (
          <div className="mt-1 rounded-xl bg-slate-50 text-xs text-slate-600 px-3 py-2 border border-slate-200">
            {subText}
          </div>
        ) : null}
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
  const [chatError, setChatError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Загрузка списка сделок supplier-а
  useEffect(() => {
    const loadDeals = async () => {
      try {
        setDealsLoading(true);
        setDealsError(null);
        const data = await listSupplierDeals(auth);
        setDeals(
          data.slice().sort((a, b) => (a.id > b.id ? -1 : 1)), // простой порядок
        );
      } catch (e) {
        console.error('Failed to load supplier deals', e);
        setDealsError('Could not load deals for this supplier.');
      } finally {
        setDealsLoading(false);
      }
    };

    void loadDeals();
  }, [auth]);

  const totalDeals = deals.length;
  const totalPaid = useMemo(
    () => deals.filter((d) => d.status === 'paid').length,
    [deals],
  );

  const ensureChatForDeal = async (deal: DealDto) => {
    try {
      setChatLoading(true);
      setChatError(null);

      const chat = await getOrCreateChatForDeal(auth, deal.id);
      setChatId(chat.id);

      const msgs = await listChatMessagesByChatId(auth, chat.id);
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to init chat for deal', e);
      setChatError('Could not load chat for this deal.');
      setMessages([]);
      setChatId(null);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSelectDeal = (deal: DealDto) => {
    setSelectedDeal(deal);
    void ensureChatForDeal(deal);
  };

  // Polling чата
  useEffect(() => {
    if (!auth || !chatId || !selectedDeal) return;

    const interval = setInterval(() => {
      listChatMessagesByChatId(auth, chatId)
        .then((msgs) => setMessages(msgs))
        .catch((e) =>
          console.error('Failed to poll supplier chat messages', e),
        );
    }, 3000);

    return () => clearInterval(interval);
  }, [auth, chatId, selectedDeal]);

  // Автоперевод сообщений от покупателя → китайский (zh-CN)
  useEffect(() => {
    const runAutoTranslate = async () => {
      if (!auth || !chatId) return;

      // ищем первое сообщение НЕ от текущего пользователя без перевода на zh
      const untranslated = messages.find((m) => {
        if (m.senderId === auth.user.id) return false;
        const tr = m.translations || [];
        const hasZh = tr.some((t) =>
          t.lang.toLowerCase().startsWith('zh'),
        );
        return !hasZh;
      });

      if (!untranslated) return;

      try {
        await translateMessageInChat(auth, chatId, untranslated.id, 'zh-CN');
        // polling обновит messages чуть позже
      } catch (e) {
        console.error('Failed to auto-translate supplier message', e);
      }
    };

    void runAutoTranslate();
  }, [auth, chatId, messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    if (!chatId || !selectedDeal) {
      addToast({
        tone: 'warn',
        title: 'Chat not ready',
        message: 'Select a deal first.',
      });
      return;
    }

    try {
      setSending(true);
      const msg = await sendChatMessageToChat(auth, chatId, {
        text,
        lang: 'zh-CN', // условный язык поставщика
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      console.error('Failed to send supplier chat message', e);
      addToast({
        tone: 'warn',
        title: 'Failed to send message',
        message: 'Please check backend API and try again.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">
            Deals &amp; Chat (Supplier)
          </div>
          <div className="mt-1 text-sm text-slate-600">
            See your confirmed deals and chat with buyers.
          </div>
          {dealsLoading ? (
            <div className="mt-1 text-xs text-blue-600">
              Loading deals from backend…
            </div>
          ) : dealsError ? (
            <div className="mt-1 text-xs text-orange-700">{dealsError}</div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">Total deals: {totalDeals}</Badge>
          <Badge tone="blue">Paid: {totalPaid}</Badge>
          <Badge tone="gray">
            Auto-translate: ON (Buyer → CN)
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Список сделок */}
        <div className="xl:col-span-1 sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">Deals</div>
            <div className="text-xs text-slate-500">
              {deals.length} record{deals.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto sf-scrollbar">
            {deals.map((d) => {
              const isSelected = selectedDeal?.id === d.id;
              const statusTone: BadgeTone =
                d.status === 'paid'
                  ? 'green'
                  : d.status === 'paid_partially'
                  ? 'orange'
                  : 'gray';
              return (
                <button
                  key={d.id}
                  onClick={() => handleSelectDeal(d)}
                  className={
                    'w-full flex items-center justify-between px-4 py-3 text-left border-b border-slate-100 transition ' +
                    (isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50')
                  }
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 sf-number truncate">
                      {d.id.slice(0, 8)}…
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Currency: {d.mainCurrency} • Status: {d.status}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Badge tone={statusTone}>{d.status}</Badge>
                  </div>
                </button>
              );
            })}
            {deals.length === 0 && !dealsLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                No deals yet. Once a buyer accepts your offer, the deal will
                appear here.
              </div>
            ) : null}
          </div>
        </div>

        {/* Чат по выбранной сделке */}
        <div className="xl:col-span-2 sf-card rounded-2xl border border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">Deal chat</div>
              <div className="mt-0.5 text-xs text-slate-600">
                {selectedDeal
                  ? `Deal ${selectedDeal.id.slice(
                      0,
                      8,
                    )}… (${selectedDeal.mainCurrency})`
                  : 'Select a deal on the left to start chatting.'}
              </div>
              {chatLoading ? (
                <div className="mt-1 text-xs text-blue-600">
                  Loading chat…
                </div>
              ) : chatError ? (
                <div className="mt-1 text-xs text-orange-700">
                  {chatError}
                </div>
              ) : null}
            </div>
            {selectedDeal ? (
              <Badge tone="gray" icon={<Icon name="truck" className="w-4 h-4" />}>
                {selectedDeal.logistics?.current || 'Logistics: n/a'}
              </Badge>
            ) : null}
          </div>

          <div className="flex-1 p-4 sf-scrollbar overflow-y-auto">
            {selectedDeal ? (
              messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((m) => {
                     const isMe = m.senderId === auth.user.id;
                     const side: ChatSide = isMe ? 'right' : 'left';
                     let mainText = m.text;
                     let subText: string | undefined = undefined;

                     if (!isMe && m.translations && m.translations.length > 0) {
                       const zhTr = m.translations.find((t) =>
                       t.lang.toLowerCase().startsWith('zh'),
                       );
                       if (zhTr) {
                         // Для демо: показываем только перевод как основной текст.
                         // Оригинал под ним не дублируем.
                         mainText = zhTr.text;
                         subText = undefined;
                       }
                     }

                     return (
                       <ChatBubble
                         key={m.id}
                         side={side}
                         author={isMe ? 'You' : 'Buyer'}
                         text={mainText}
                         subText={subText}
                         ts={m.createdAt}
                       />
                     );
                  })}
                </div>
              ) : chatLoading ? (
                <div className="text-xs text-slate-500">Loading messages…</div>
              ) : (
                <div className="text-xs text-slate-500">
                  No messages yet. Start the conversation with the buyer.
                </div>
              )
            ) : (
              <div className="text-xs text-slate-500">
                Select a deal to see chat history.
              </div>
            )}
          </div>

          {/* input */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  selectedDeal
                    ? 'Напишите покупателю… (условия, сроки, статус отгрузки)'
                    : 'Выберите сделку, чтобы написать покупателю.'
                }
                disabled={!selectedDeal}
                rows={2}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 disabled:bg-slate-100 disabled:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <button
                onClick={() => void handleSend()}
                disabled={!selectedDeal || sending}
                className={
                  'rounded-xl px-4 py-2.5 text-sm font-semibold ' +
                  (!selectedDeal
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : sending
                    ? 'bg-slate-400 text-white cursor-wait'
                    : 'bg-[var(--sf-blue-900)] text-white hover:bg-[var(--sf-blue-800)]')
                }
              >
                Send
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Press Enter to send, Shift+Enter for new line.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};