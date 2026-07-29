import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
}

const TYPES = [
  { value: 'PURCHASE', label: 'stockAdjust.typePurchase' },
  { value: 'SPOILAGE', label: 'stockAdjust.typeSpoilage' },
  { value: 'ADJUSTMENT_ADD', label: 'stockAdjust.typeAdjustAdd' },
  { value: 'ADJUSTMENT_REMOVE', label: 'stockAdjust.typeAdjustRemove' },
];

export default function StockAdjust() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'PURCHASE', quantity: 0, note: '' });

  useEffect(() => {
    if (!id) return;
    api.get<{ success: boolean; data: Ingredient }>(`/inventory/ingredients/${id}`)
      .then((res) => {
        setIngredient(res.data);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.quantity <= 0) { setError(t('stockAdjust.positiveRequired')); return; }
    setSaving(true);
    setError(null);
    try {
      await api.post(`/inventory/ingredients/${id}/stock`, form);
      navigate('/inventory/ingredients');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>;
  if (!ingredient) return <p className="text-red-600">{t('stockAdjust.notFound')}</p>;

  const isAdd = form.type === 'PURCHASE' || form.type === 'ADJUSTMENT_ADD';

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('stockAdjust.title')}</h2>
      <p className="text-gray-500 mb-6">{ingredient.name} &mdash; {t('stockAdjust.currentStock')}: <strong>{ingredient.stock} {ingredient.unit}</strong></p>

      {error && <p className="text-red-600 mb-4">{t('common.error')}: {error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockAdjust.type')}</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {TYPES.map((tItem) => <option key={tItem.value} value={tItem.value}>{t(tItem.label)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('stockAdjust.quantity')} ({isAdd ? t('stockAdjust.addSuffix') : t('stockAdjust.removeSuffix')})
          </label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            min={0}
            step={0.1}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {!isAdd && ingredient && (
            <p className="text-xs text-gray-400 mt-1">{t('stockAdjust.maxAvailable')}: {ingredient.stock}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockAdjust.note')}</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder={t('stockAdjust.notePlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? t('common.saving') : t('stockAdjust.confirm')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory/ingredients')}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
