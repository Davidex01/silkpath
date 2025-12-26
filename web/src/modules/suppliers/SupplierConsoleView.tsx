// web/src/modules/supplier/SupplierConsoleView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import { Badge } from '../../components/common/Badge';
import type { Toast } from '../../components/common/ToastStack';

interface SupplierConsoleViewProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

interface RFQItemDto {
  productId?: string | null;
  name: string;
  qty: number;
  unit: string;
  targetPrice?: number | null;
  notes?: string | null;
}

type RFQStatus = 'draft' | 'sent' | 'responded' | 'closed';

interface RFQDto {
  id: string;
  buyerOrgId: string;
  supplierOrgId?: string | null;
  status: RFQStatus;
  items: RFQItemDto[];
  createdAt: string;
}

// ѕростой клиент дл€ /rfqs?role=supplier
async function listSupplierRFQs(auth: AuthState): Promise<RFQDto[]> {
  const token = auth.tokens.accessToken;
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE ?? 'http://localhost:8001'}/rfqs?role=supplier`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as RFQDto[];
}

export const SupplierConsoleView: React.FC<SupplierConsoleViewProps> = ({
  auth,
  addToast,
}) => {
  const [rfqs, setRfqs] = useState<RFQDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listSupplierRFQs(auth);
        setRfqs(
          data.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
        );
      } catch (e) {
        console.error('Failed to load supplier RFQs', e);
        setError('Could not load RFQs for this supplier.');
        addToast({
          tone: 'warn',
          title: 'RFQ load failed',
          message: 'Please check backend API for RFQs.',
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [auth, addToast]);

  const totalOpen = useMemo(
    () => rfqs.filter((r) => r.status !== 'closed').length,
    [rfqs],
  );

  return (
    <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      {/* —татистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="sf-card rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-600">Total RFQs</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
            {rfqs.length}
          </div>
        </div>
        <div className="sf-card rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-semibold text-blue-700">
            Open / In progress
          </div>
          <div className="mt-1 text-lg font-extrabold text-blue-900 sf-number">
            {totalOpen}
          </div>
        </div>
        <div className="sf-card rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-xs font-semibold text-emerald-700">
            Ready for Offer (demo)
          </div>
          <div className="mt-1 text-lg font-extrabold text-emerald-900 sf-number">
            {rfqs.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-blue-600">
          Loading RFQs from backendЕ
        </div>
      ) : error ? (
        <div className="text-xs text-orange-700">{error}</div>
      ) : null}

      {/* RFQ-таблица */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">RFQs for your org</div>
          <div className="text-xs text-slate-500">
            Showing {rfqs.length} request{rfqs.length !== 1 ? 's' : ''}.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  RFQ ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Item
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Qty
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((rfq, i) => {
                const item = rfq.items[0];
                const isEven = i % 2 === 0;
                return (
                  <tr
                    key={rfq.id}
                    className={isEven ? 'bg-white' : 'bg-slate-50/50'}
                  >
                    <td className="px-4 py-3 text-slate-700 sf-number">
                      {rfq.id.slice(0, 8)}Е
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900 font-medium truncate">
                        {item?.name || 'Ч'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 sf-number">
                      {item ? `${item.qty} ${item.unit}` : 'Ч'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          rfq.status === 'closed'
                            ? 'gray'
                            : rfq.status === 'responded'
                            ? 'blue'
                            : 'orange'
                        }
                      >
                        {rfq.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 sf-number">
                      {rfq.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-default"
                      >
                        Make Offer (use full RFQ flow)
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rfqs.length === 0 && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No RFQs for this supplier yet. In the demo, log in as a buyer and
            create an RFQ that targets this org as supplier.
          </div>
        ) : null}
      </div>
    </main>
  );
};