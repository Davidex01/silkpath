// src/modules/documents/DocumentsView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { DealState } from '../../state/dealTypes';
import type { AuthState } from '../../state/authTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import type { Toast } from '../../components/common/ToastStack';
import {
  listDealDocuments,
  createDealDocument,
  type Document as BackendDocument,
  type DocumentType,
} from '../../api/documents';
import { createDummyFile } from '../../api/files';

interface DocumentsViewProps {
  deal: DealState;
  addToast: (t: Omit<Toast, 'id'>) => void;
  auth: AuthState;
}

// Категория для UI-вкладок
type DocCategory = 'all' | 'legal' | 'financial' | 'logistics';

// Этап для чек-листа
type DocStage = 'deal' | 'finance' | 'logistics';

// Конфигурация обязательных документов по сделке
interface RequiredDoc {
  id: string;
  type: DocumentType;
  label: string;
  stage: DocStage;
  optional?: boolean;
  hint?: string;
}

const REQUIRED_DOCS: RequiredDoc[] = [
  {
    id: 'contract',
    type: 'contract',
    label: 'Контракт поставки',
    stage: 'deal',
    hint: 'Основной договор между вами и поставщиком',
  },
  {
    id: 'invoice',
    type: 'invoice',
    label: 'Коммерческий инвойс',
    stage: 'finance',
    hint: 'Основа для таможни и оплат',
  },
  {
    id: 'packing_list',
    type: 'packing_list',
    label: 'Packing List',
    stage: 'logistics',
    hint: 'Содержимое коробок, количество мест и вес',
  },
  {
    id: 'spec',
    type: 'specification',
    label: 'Спецификация',
    stage: 'deal',
    optional: true,
    hint: 'Подробные характеристики товара',
  },
];

type DocStatus = 'uploaded' | 'missing';

// Подсказка
const HelpTip: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-4 h-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 grid place-items-center text-[10px] font-bold transition"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 left-5 top-0 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-3 sf-fade-in">
          <div className="text-xs font-bold text-slate-900 mb-1">{title}</div>
          <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
};

// Маппинг типа документа в UI-метаданные
function mapTypeToCategory(type: DocumentType): DocCategory {
  switch (type) {
    case 'contract':
    case 'purchase_order':
    case 'specification':
      return 'legal';
    case 'invoice':
      return 'financial';
    case 'packing_list':
      return 'logistics';
    default:
      return 'all';
  }
}

function mapTypeToLabel(type: DocumentType): string {
  switch (type) {
    case 'contract':
      return 'Контракт';
    case 'purchase_order':
      return 'Purchase Order';
    case 'invoice':
      return 'Инвойс';
    case 'packing_list':
      return 'Packing List';
    case 'specification':
      return 'Спецификация';
    case 'other':
    default:
      return 'Документ';
  }
}

function getIconForType(type: DocumentType) {
  switch (type) {
    case 'contract':
      return <Icon name="docs" className="w-5 h-5 text-blue-600" />;
    case 'invoice':
      return <Icon name="wallet" className="w-5 h-5 text-emerald-600" />;
    case 'packing_list':
      return <Icon name="truck" className="w-5 h-5 text-orange-600" />;
    case 'specification':
      return <Icon name="docs" className="w-5 h-5 text-slate-700" />;
    default:
      return <Icon name="paperclip" className="w-5 h-5 text-slate-500" />;
  }
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  deal,
  addToast,
  auth,
}) => {
  const [category, setCategory] = useState<DocCategory>('all');

  const [backendDocs, setBackendDocs] = useState<BackendDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const dealId = deal.backend?.dealId ?? null;

  // Загрузка документов с бэкенда
  useEffect(() => {
    const load = async () => {
      if (!dealId) return;
      try {
        setLoading(true);
        setBackendError(null);
        const docs = await listDealDocuments(auth, dealId);
        setBackendDocs(docs);
      } catch (e) {
        console.error('Failed to load deal documents', e);
        setBackendError('Не удалось загрузить документы с сервера.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auth, dealId]);

  // Проверка наличия документа определённого типа
  const hasDocOfType = (type: DocumentType): boolean =>
    backendDocs.some((d) => d.type === type);

  // Чек-лист
  const checklist = useMemo(
    () =>
      REQUIRED_DOCS.map((req) => {
        const present = hasDocOfType(req.type);
        const status: DocStatus = present ? 'uploaded' : 'missing';
        return { ...req, status };
      }),
    [backendDocs],
  );

  // Фильтрация для таблицы
  const filteredDocs = useMemo(() => {
    if (category === 'all') return backendDocs;
    return backendDocs.filter((d) => mapTypeToCategory(d.type) === category);
  }, [backendDocs, category]);

  // Создание демо-документа (через dummy-файл и /documents)
  const handleCreateDemoDoc = async (req: RequiredDoc) => {
    if (!dealId) {
      addToast({
        tone: 'warn',
        title: 'Нет привязки к сделке',
        message: 'Создайте и привяжите сделку, прежде чем загружать документы.',
      });
      return;
    }

    try {
      setCreatingFor(req.id);
      // 1. Создаём dummy-файл на бэке (/files)
      const file = await createDummyFile();
      // 2. Создаём документ для сделки
      const created = await createDealDocument(auth, dealId, {
        type: req.type,
        title: req.label,
        fileId: file.id,
      });

      setBackendDocs((prev) => [...prev, created]);
      addToast({
        tone: 'success',
        title: `${req.label} создан`,
        message: 'Документ добавлен к сделке (демо-режим).',
      });
    } catch (e) {
      console.error('Failed to create demo doc', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка создания документа',
        message: 'Не удалось создать документ. Проверьте подключение.',
      });
    } finally {
      setCreatingFor(null);
    }
  };

  // Drag & Drop (пока демо)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addToast({
      tone: 'info',
      title: 'Загрузка документа (демо)',
      message:
        'В продакшене здесь откроется диалог выбора типа документа и загрузка на сервер.',
    });
  };

  const totalRequired = REQUIRED_DOCS.filter((d) => !d.optional).length;
  const uploadedRequired = checklist.filter(
    (d) => !d.optional && d.status === 'uploaded',
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-slate-900 text-xl font-bold">Документооборот</div>
            <Badge
              tone="green"
              icon={<Icon name="shield" className="w-4 h-4" />}
            >
              Secure Vault
            </Badge>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Все ключевые документы по сделке в одном защищённом хранилище.
          </div>
          {dealId ? (
            <div className="mt-1 text-xs text-slate-500">
              ID сделки:{' '}
              <span className="font-mono sf-number text-slate-700">
                {dealId.slice(0, 12)}…
              </span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-orange-700">
              Сделка не привязана — документы будут только демонстрационными.
            </div>
          )}
          {loading && (
            <div className="mt-1 text-xs text-blue-600">
              Загрузка документов с сервера…
            </div>
          )}
          {backendError && (
            <div className="mt-1 text-xs text-orange-700">{backendError}</div>
          )}
        </div>
        <button
          onClick={() =>
            addToast({
              tone: 'info',
              title: 'Экспорт архива',
              message: 'В продакшене здесь будет ZIP-архив со всеми документами.',
            })
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
        >
          <Icon name="docs" className="w-4 h-4" />
          Скачать всё
        </button>
      </div>

      {/* ===== CHECKLIST ===== */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-slate-900">
              Чек‑лист по сделке
            </div>
            <HelpTip title="Обязательные документы">
              Эти документы обычно требуют банк, бухгалтерия и таможня.
              Загружайте их по мере прохождения сделки.
            </HelpTip>
          </div>
          <div className="text-xs text-slate-500">
            Готово{' '}
            <span className="font-semibold text-slate-900">
              {uploadedRequired}/{totalRequired}
            </span>{' '}
            обязательных документов
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-3"
            >
              <div
                className={
                  'w-8 h-8 rounded-xl grid place-items-center ' +
                  (item.status === 'uploaded'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400')
                }
              >
                {item.status === 'uploaded' ? (
                  <Icon name="check" className="w-4 h-4" />
                ) : (
                  <Icon name="docs" className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </span>
                  {item.optional && (
                    <Badge tone="gray" className="text-[10px]">
                      Опционально
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Этап:{' '}
                  {item.stage === 'deal'
                    ? 'Сделка'
                    : item.stage === 'finance'
                    ? 'Финансы'
                    : 'Логистика'}
                </div>
                {item.hint && (
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {item.hint}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <Badge
                  tone={item.status === 'uploaded' ? 'green' : 'orange'}
                  className="text-[10px]"
                >
                  {item.status === 'uploaded' ? 'Готово' : 'Не загружен'}
                </Badge>
                {item.status === 'missing' && (
                  <button
                    disabled={creatingFor === item.id || !dealId}
                    onClick={() => void handleCreateDemoDoc(item)}
                    className={
                      'mt-1 rounded-lg px-2 py-1 text-[11px] font-semibold ' +
                      (dealId
                        ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        : 'border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed')
                    }
                  >
                    {creatingFor === item.id ? 'Создание…' : 'Добавить (демо)'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== UPLOAD ZONE ===== */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          addToast({
            tone: 'info',
            title: 'Загрузка документа (демо)',
            message:
              'В продакшене здесь будет диалог выбора файла и типа документа.',
          })
        }
        className={
          'rounded-2xl border-2 border-dashed transition-all p-8 text-center cursor-pointer ' +
          (isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400')
        }
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-white border border-slate-200 grid place-items-center mb-3 shadow-sm">
          <Icon name="paperclip" className="w-6 h-6 text-slate-400" />
        </div>
        <div className="text-sm font-semibold text-slate-900">
          Нажмите или перетащите файл сюда
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Поддерживаются PDF / JPG / PNG до 25 MB
        </div>
      </div>

      {/* ===== TABS (CATEGORIES) ===== */}
      <div className="border-b border-slate-200 flex gap-6">
        {[
          { id: 'all', label: 'Все документы' },
          { id: 'legal', label: 'Юридические' },
          { id: 'financial', label: 'Финансовые' },
          { id: 'logistics', label: 'Логистика' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategory(tab.id as DocCategory)}
            className={
              'pb-3 text-sm font-semibold border-b-2 transition ' +
              (category === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== DOCUMENTS TABLE ===== */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">
            Документы ({filteredDocs.length})
          </div>
          {loading && (
            <div className="text-xs text-blue-600">Обновление списка…</div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 grid place-items-center shrink-0 border border-slate-100">
                  {getIconForType(doc.type)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {doc.title || mapTypeToLabel(doc.type)}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span className="sf-number">
                      {doc.createdAt.slice(0, 10)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="sf-number">
                      fileId: {doc.fileId.slice(0, 8)}…
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge tone="green" className="text-[10px]">
                  Загружен
                </Badge>
                <button
                  onClick={() =>
                    addToast({
                      tone: 'info',
                      title: 'Скачивание (демо)',
                      message:
                        'В реальном продукте здесь начнётся скачивание файла.',
                    })
                  }
                  className="p-2 text-slate-400 hover:text-blue-600 transition rounded-lg hover:bg-blue-50"
                  title="Скачать"
                >
                  <Icon name="docs" className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-500 text-sm">
              В этой категории пока нет документов.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};