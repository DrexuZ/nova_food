import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
}

const TYPES = [
  { value: 'PURCHASE', label: 'Purchase (In)' },
  { value: 'SPOILAGE', label: 'Spoilage / Waste (Out)' },
  { value: 'ADJUSTMENT_ADD', label: 'Adjustment Add (In)' },
  { value: 'ADJUSTMENT_REMOVE', label: 'Adjustment Remove (Out)' },
];

export default function StockAdjust() {
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
    if (form.quantity <= 0) { setError('Quantity must be positive'); return; }
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

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!ingredient) return <p className="text-red-600">Ingredient not found</p>;

  const isAdd = form.type === 'PURCHASE' || form.type === 'ADJUSTMENT_ADD';

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Adjust Stock</h2>
      <p className="text-gray-500 mb-6">{ingredient.name} &mdash; Current stock: <strong>{ingredient.stock} {ingredient.unit}</strong></p>

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({isAdd ? 'add' : 'remove'})</label>
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
            <p className="text-xs text-gray-400 mt-1">Max available: {ingredient.stock}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="e.g. Weekly vegetable purchase"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Confirm Adjustment'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory/ingredients')}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
