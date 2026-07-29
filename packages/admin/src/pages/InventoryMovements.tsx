import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface Movement {
  id: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
  ingredient: { id: string; name: string; unit: string };
  createdBy: { id: string; name: string } | null;
}

interface MovementResponse {
  success: boolean;
  data: Movement[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'bg-green-100 text-green-800',
  SALE: 'bg-blue-100 text-blue-800',
  SPOILAGE: 'bg-red-100 text-red-800',
  ADJUSTMENT_ADD: 'bg-yellow-100 text-yellow-800',
  ADJUSTMENT_REMOVE: 'bg-orange-100 text-orange-800',
  TRANSFER_IN: 'bg-purple-100 text-purple-800',
  TRANSFER_OUT: 'bg-purple-100 text-purple-800',
};

export default function InventoryMovements() {
  const { t } = useTranslation();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const TYPE_LABELS: Record<string, string> = {
    PURCHASE: t('movements.purchase'),
    SALE: t('movements.sale'),
    SPOILAGE: t('movements.spoilage'),
    ADJUSTMENT_ADD: t('movements.adjustPlus'),
    ADJUSTMENT_REMOVE: t('movements.adjustMinus'),
    TRANSFER_IN: t('movements.transferIn'),
    TRANSFER_OUT: t('movements.transferOut'),
  };

  const fetchMovements = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (typeFilter) params.set('type', typeFilter);

    api.get<MovementResponse>(`/inventory/movements?${params}`)
      .then((res) => {
        setMovements(res.data);
        setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { fetchMovements(1); }, [typeFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('movements.title')}</h2>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label={t('movements.filterType')}
        >
          <option value="">{t('movements.allTypes')}</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 mb-4">{t('common.error')}: {error}</p>}

      {loading && <p className="text-gray-500">{t('movements.loading')}</p>}

      {!loading && movements.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">{t('movements.empty')}</p>
        </div>
      )}

      {!loading && movements.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.ingredient')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.qty')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.before')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.after')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.reference')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('movements.by')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[m.type] || 'bg-gray-100 text-gray-800'}`}>
                        {TYPE_LABELS[m.type] || m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {m.ingredient.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className={m.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity} {m.ingredient.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.stockBefore}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.stockAfter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.reference || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.createdBy?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">{t('movements.total', { count: pagination.total })}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchMovements(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  {t('common.previous')}
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {t('common.pageOf', { page: pagination.page, total: pagination.totalPages })}
                </span>
                <button
                  onClick={() => fetchMovements(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
