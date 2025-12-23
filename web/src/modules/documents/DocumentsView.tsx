// src/modules/documents/DocumentsView.tsx
import React, { useMemo, useState, useEffect } from 'react';
import type { DealState } from '../../state/dealTypes';
import type { AuthState } from '../../state/authTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import type { Toast } from '../../components/common/ToastStack';
import { listDealDocuments } from '../../api/documents';

type DocStageId = 'discovery' | 'deal' | 'logistics';

type DocType = 'contract' | 'invoice' | 'packing' | 'customs' | 'video' | 'rfq';

type DocStatus =
  | 'Draft'
  | 'Signed'
  | 'Processed'
  | 'Uploaded'
  | 'Pending'
  | 'In Review'
  | 'Archived';

type DocStatusTone = 'gray' | 'green' | 'orange' | 'blue';

interface DealDocumentUI {
  id: string;
  type: DocType;
  typeLabel: string;
  name: string;
  stage: string;
  stageId: DocStageId;
  date: string;
  status: DocStatus;
  statusTone: DocStatusTone;
  description: string;
}

interface DocumentsViewProps {
  deal: DealState;
  addToast: (t: Omit<Toast, 'id'>) => void;
  auth: AuthState;
}

// Маппинг типов из API в DocType
function mapDocumentType(apiType: string): DocType {
  switch (apiType) {
    case 'contract':
      return 'contract';
    case 'invoice':
      return 'invoice';
    case 'packing_list':
      return 'packing';
    case 'customs_declaration':
      return 'customs';
    default:
      return 'customs'; // fallback
  }
}

function mapDocumentLabel(apiType: string): string {
  switch (apiType) {
    case 'contract':
      return 'Contract';
    case 'invoice':
      return 'Commercial Invoice';
    case 'packing_list':
      return 'Packing List';
    case 'customs_declaration':
      return 'Customs Document';
    default:
      return 'Document';
  }
}

function DocIcon({ type, className = '' }: { type: DocType; className?: string }) {
  const map: Record<DocType, 'docs' | 'wallet' | 'truck' | 'shield' | 'play'> = {
    contract: 'docs',
    invoice: 'wallet',
    packing: 'truck',
    customs: 'shield',
    video: 'play',
    rfq: 'docs',
  };
  return <Icon name={map[type]} className={className} />;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  deal,
  addToast,
  auth,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DealDocumentUI | null>(null);
  const [stageFilter, setStageFilter] = useState<'all' | DocStageId>('all');

  const [backendDocs, setBackendDocs] = useState<DealDocumentUI[]>([]);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const dealId = useMemo(() => {
    const s = (deal.supplier?.id || 'sf').slice(0, 6).toUpperCase();
    return `SF-${s}-0142`;
  }, [deal.supplier?.id]);

  // Демо-документы, завязанные на состоянии сделки
  const demoDocuments: DealDocumentUI[] = useMemo(() => {
    const isSigned = deal.stage !== 'Draft';
    const escrowFunded =
      deal.payment.status === 'Escrow Funded' ||
      deal.payment.status === 'Funds Released';
    const isShipped = deal.stage === 'Shipped';
    const delivered = deal.logistics.delivered;

    return [
      {
        id: 'contract-1',
        type: 'contract',
        typeLabel: 'Contract',
        name: `Contract_${dealId}.pdf`,
        stage: 'Negotiation & Payment',
        stageId: 'deal',
        date: '2025-01-12',
        status: isSigned ? 'Signed' : 'Draft',
        statusTone: isSigned ? 'green' : 'gray',
        description:
          'RFQ/Purchase agreement between buyer and supplier. Contains terms, pricing, quantity, and Incoterms.',
      },
      {
        id: 'invoice-1',
        type: 'invoice',
        typeLabel: 'Commercial Invoice',
        name: `Invoice_${dealId}.pdf`,
        stage: 'Negotiation & Payment',
        stageId: 'deal',
        date: '2025-01-13',
        status: escrowFunded ? 'Processed' : 'Pending',
        statusTone: escrowFunded ? 'green' : 'orange',
        description:
          'Commercial invoice for customs declaration. Lists goods, quantities, prices in CNY and RUB.',
      },
      {
        id: 'packing-1',
        type: 'packing',
        typeLabel: 'Packing List',
        name: `PackingList_${dealId}.pdf`,
        stage: 'Logistics & Execution',
        stageId: 'logistics',
        date: '2025-01-14',
        status: isShipped ? 'Uploaded' : 'Pending',
        statusTone: isShipped ? 'green' : 'orange',
        description:
          'Detailed list of package contents, weights, dimensions, and carton numbers for customs and warehouse.',
      },
      {
        id: 'customs-1',
        type: 'customs',
        typeLabel: 'Customs Declaration',
        name: `CustomsDecl_${dealId}.pdf`,
        stage: 'Logistics & Execution',
        stageId: 'logistics',
        date: '2025-01-15',
        status: delivered ? 'Processed' : isShipped ? 'In Review' : 'Pending',
        statusTone: delivered ? 'green' : isShipped ? 'blue' : 'orange',
        description: `HS code ${
          deal.calc.hs.code
        } declaration. Includes duty (${fmt.pct(
          deal.calc.hs.duty,
        )}) and VAT (${fmt.pct(deal.calc.hs.vat)}) calculation.`,
      },
      {
        id: 'video-1',
        type: 'video',
        typeLabel: 'Acceptance Proof',
        name: `AcceptanceVideo_${dealId}.mp4`,
        stage: 'Logistics & Execution',
        stageId: 'logistics',
        date: '2025-01-16',
        status: 'Uploaded',
        statusTone: 'green',
        description:
          'Video inspection from warehouse showing sealed cartons, quantity check, and random sample inspection.',
      },
      {
        id: 'rfq-1',
        type: 'rfq',
        typeLabel: 'RFQ Draft',
        name: `RFQ_Draft_${dealId}.pdf`,
        stage: 'Discovery',
        stageId: 'discovery',
        date: '2025-01-10',
        status: 'Archived',
        statusTone: 'gray',
        description:
          'Initial Request for Quotation sent to supplier. Superseded by signed contract.',
      },
    ];
  }, [deal, dealId]);

  // Все документы: сначала backend, потом демо
  const allDocuments = useMemo(
    () => [...backendDocs, ...demoDocuments],
    [backendDocs, demoDocuments],
  );

  const filteredDocs = useMemo(() => {
    if (stageFilter === 'all') return allDocuments;
    return allDocuments.filter((d) => d.stageId === stageFilter);
  }, [allDocuments, stageFilter]);

  const stages = [
    { id: 'all' as const, label: 'All Documents' },
    { id: 'discovery' as const, label: '1. Discovery' },
    { id: 'deal' as const, label: '2. Negotiation & Payment' },
    { id: 'logistics' as const, label: '3. Logistics & Execution' },
  ];

  const openPreview = (doc: DealDocumentUI) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleDownload = (doc: DealDocumentUI) => {
    addToast({
      tone: 'info',
      title: 'Download simulated',
      message: `${doc.name} would be downloaded in production.`,
    });
  };

  // Загружаем backend-документы
  useEffect(() => {
    const load = async () => {
      if (!deal.backend?.dealId) return;

      try {
        setLoadingBackend(true);
        setBackendError(null);

        const docs = await listDealDocuments(auth, deal.backend.dealId);

        const mapped: DealDocumentUI[] = docs.map((d) => ({
          id: d.id,
          type: mapDocumentType(d.type),
          typeLabel: mapDocumentLabel(d.type),
          name: d.title || `${d.type}_${d.id}.pdf`,
          stage: 'Negotiation & Payment',
          stageId: 'deal',
          date: d.createdAt.slice(0, 10),
          status: 'Processed',
          statusTone: 'green',
          description: `Backend document of type ${d.type} linked to deal.`,
        }));

        setBackendDocs(mapped);
      } catch (e) {
        console.error('Failed to load backend documents', e);
        setBackendError('Could not load documents from backend');
      } finally {
        setLoadingBackend(false);
      }
    };

    void load();
  }, [auth, deal.backend?.dealId]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">Documents</div>
          <div className="mt-1 text-sm text-slate-600">
            Archive of contracts, invoices, customs docs, and proof of delivery for
            deal{' '}
            <span className="font-semibold text-slate-900 sf-number">{dealId}</span>.
          </div>
          {loadingBackend ? (
            <div className="mt-1 text-xs text-blue-600">
              Loading documents from backend…
            </div>
          ) : backendError ? (
            <div className="mt-1 text-xs text-orange-700">{backendError}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              addToast({
                tone: 'info',
                title: 'Export all (demo)',
                message:
                  'In production, this would generate a ZIP with all documents for your accountant.',
              })
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Icon name="docs" className="w-4 h-4" />
            Export All (demo)
          </button>
        </div>
      </div>

      {/* Stage Filter Tabs */}
      <div className="mt-5 sf-card rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap items-center gap-2">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => setStageFilter(s.id)}
              className={
                'rounded-xl px-3 py-2 text-sm font-semibold transition ring-1 ring-inset ' +
                (stageFilter === s.id
                  ? 'bg-blue-50 text-blue-900 ring-blue-200'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
              }
            >
              {s.label}
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {filteredDocs.length}
            </span>{' '}
            document{filteredDocs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="mt-4 sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Stage
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc, i) => (
                <tr
                  key={doc.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={
                          'w-8 h-8 rounded-lg grid place-items-center ' +
                          (doc.type === 'contract'
                            ? 'bg-blue-50 text-blue-700'
                            : doc.type === 'invoice'
                            ? 'bg-teal-50 text-teal-700'
                            : doc.type === 'packing'
                            ? 'bg-orange-50 text-orange-700'
                            : doc.type === 'customs'
                            ? 'bg-emerald-50 text-emerald-700'
                            : doc.type === 'video'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-slate-50 text-slate-700')
                        }
                      >
                        <DocIcon type={doc.type} className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-900">
                        {doc.typeLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900 font-medium sf-number">
                      {doc.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' +
                        (doc.stageId === 'discovery'
                          ? 'bg-slate-100 text-slate-700'
                          : doc.stageId === 'deal'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-teal-50 text-teal-800')
                      }
                    >
                      {doc.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 sf-number">
                    {doc.date}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={doc.statusTone}
                      icon={
                        doc.status === 'Signed' ||
                        doc.status === 'Processed' ||
                        doc.status === 'Uploaded' ? (
                          <Icon name="check" className="w-4 h-4" />
                        ) : doc.status === 'In Review' ? (
                          <Icon name="clock" className="w-4 h-4" />
                        ) : undefined
                      }
                    >
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPreview(doc)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-slate-400 mb-2">
              <Icon name="docs" className="w-8 h-8 mx-auto" />
            </div>
            <div className="text-sm text-slate-600">
              No documents in this stage yet.
            </div>
          </div>
        ) : null}

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Documents are auto-archived and versioned by SilkFlow.
            </div>
            <div className="text-xs text-slate-500">
              Deal:{' '}
              <span className="font-semibold text-slate-700 sf-number">
                {dealId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="sf-card rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-600">
            Total Documents
          </div>
          <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
            {allDocuments.length}
          </div>
        </div>
        <div className="sf-card rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-xs font-semibold text-emerald-700">
            Signed / Processed
          </div>
          <div className="mt-1 text-lg font-extrabold text-emerald-900 sf-number">
            {
              allDocuments.filter((d) =>
                ['Signed', 'Processed', 'Uploaded'].includes(d.status),
              ).length
            }
          </div>
        </div>
        <div className="sf-card rounded-xl border border-orange-200 bg-orange-50 p-3">
          <div className="text-xs font-semibold text-orange-700">Pending</div>
          <div className="mt-1 text-lg font-extrabold text-orange-900 sf-number">
            {allDocuments.filter((d) => d.status === 'Pending').length}
          </div>
        </div>
        <div className="sf-card rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-semibold text-blue-700">In Review</div>
          <div className="mt-1 text-lg font-extrabold text-blue-900 sf-number">
            {allDocuments.filter((d) => d.status === 'In Review').length}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-700 mt-0.5">
            <Icon name="spark" />
          </div>
          <div>
            <div className="text-sm font-semibold text-blue-900">
              One-click export for compliance
            </div>
            <div className="mt-1 text-xs text-blue-800">
              In production, all documents are stored with audit trails. Export a
              complete package for your accountant, bank, or customs broker with a
              single click.
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewOpen && previewDoc ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={
                    'w-10 h-10 rounded-xl grid place-items-center ' +
                    (previewDoc.type === 'contract'
                      ? 'bg-blue-50 text-blue-700'
                      : previewDoc.type === 'invoice'
                      ? 'bg-teal-50 text-teal-700'
                      : previewDoc.type === 'packing'
                      ? 'bg-orange-50 text-orange-700'
                      : previewDoc.type === 'customs'
                      ? 'bg-emerald-50 text-emerald-700'
                      : previewDoc.type === 'video'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-slate-50 text-slate-700')
                  }
                >
                  <DocIcon type={previewDoc.type} className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">
                    Document Preview
                  </div>
                  <div className="text-xs text-slate-600">
                    {previewDoc.typeLabel}
                  </div>
                </div>
              </div>
              <button
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setPreviewOpen(false)}
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="p-5">
              {/* Document info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      File Name
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 sf-number">
                      {previewDoc.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      Status
                    </div>
                    <div className="mt-1">
                      <Badge tone={previewDoc.statusTone}>
                        {previewDoc.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      Stage
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {previewDoc.stage}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      Date
                    </div>
                    <div className="mt-1 text-sm text-slate-900 sf-number">
                      {previewDoc.date}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview placeholder */}
              <div className="rounded-2xl border border-slate-200 bg-slate-100 h-64 grid place-items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-slate-900/5 to-teal-600/10" />
                <div className="absolute inset-0 sf-grid-bg opacity-40" />
                <div className="text-center relative z-10">
                  <div
                    className={
                      'mx-auto w-16 h-16 rounded-2xl grid place-items-center ring-4 ' +
                      (previewDoc.type === 'contract'
                        ? 'bg-blue-100 text-blue-700 ring-blue-50'
                        : previewDoc.type === 'invoice'
                        ? 'bg-teal-100 text-teal-700 ring-teal-50'
                        : previewDoc.type === 'packing'
                        ? 'bg-orange-100 text-orange-700 ring-orange-50'
                        : previewDoc.type === 'customs'
                        ? 'bg-emerald-100 text-emerald-700 ring-emerald-50'
                        : previewDoc.type === 'video'
                        ? 'bg-purple-100 text-purple-700 ring-purple-50'
                        : 'bg-slate-100 text-slate-700 ring-slate-50')
                    }
                  >
                    <DocIcon type={previewDoc.type} className="w-8 h-8" />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-900">
                    {previewDoc.typeLabel}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
                    This is a prototype preview. In a real product, the actual{' '}
                    {previewDoc.type === 'video' ? 'video' : 'PDF'} would be
                    displayed here.
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-700">
                  Description
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {previewDoc.description}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDownload(previewDoc)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                Download (demo)
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--sf-blue-800)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};