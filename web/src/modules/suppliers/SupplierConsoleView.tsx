import React, { useEffect, useState, useMemo } from 'react';
import type { AuthState } from '../../state/authTypes';
import { listSupplierRFQs, type RFQDto } from '../../api/rfqs';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
// import { fmt } from '../../components/lib/format';

interface SupplierConsoleViewProps {
  auth: AuthState;
}

export const SupplierConsoleView: React.FC<SupplierConsoleViewProps> = ({ auth }) => {
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
          data.slice().sort((a, b) =>
            a.createdAt > b.createdAt ? -1 : 1,
          ),
        );
      } catch (e) {
        console.error('Failed to load supplier RFQs', e);
        setError('Could not load RFQs for this supplier.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [auth]);

  const totalOpen = useMemo(
    () => rfqs.filter((r) => r.status !== 'closed').length,
    [rfqs],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ¬ерхн€€ панель */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Supplier Console</div>
            <div className="text-lg font-extrabold text-slate-900">
              Incoming RFQs
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Organization:{' '}
              <span className="font-semibold text-slate-900">
                {auth.org.name}
              </span>{' '}
              ({auth.org.country}, role: {auth.org.role})
            </div>
            {loading ? (
              <div className="mt-1 text-xs text-blue-600">
                Loading RFQs from backendЕ
              </div>
            ) : error ? (
              <div className="mt-1 text-xs text-orange-700">{error}</div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
              KYB status: {auth.org.country === 'CN' ? 'Verified (demo)' : 'Pending'}
            </Badge>
          </div>
        </div>
      </div>

      {/*  онтент */}
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

        {/* “аблица RFQ */}
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
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq, i) => {
                  const firstItem = rfq.items[0];
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
                          {firstItem?.name || 'Ч'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 sf-number">
                        {firstItem ? `${firstItem.qty} ${firstItem.unit}` : 'Ч'}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rfqs.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No RFQs for this supplier yet.  
              In the demo, log in as a buyer and create an RFQ that targets this org as supplier.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};