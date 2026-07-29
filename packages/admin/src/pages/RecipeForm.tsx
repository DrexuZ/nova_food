import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  isActive?: boolean;
}

interface MenuItem {
  id: string;
  name: string;
}

interface RecipeIngredientEntry {
  ingredientId: string;
  quantity: number;
  unit: string;
  notes: string;
}

const UNITS = ['KG', 'G', 'L', 'ML', 'UNIDAD', 'DOCENA', 'PAQUETE', 'LITRO', 'KILO', 'GRAMO', 'MILILITRO', 'CAJA', 'BOTELLA', 'LATA', 'PORCION'];

export default function RecipeForm() {
  const { t } = useTranslation();
  const { menuItemId } = useParams<{ menuItemId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [form, setForm] = useState({ name: '', yield: 1, instructions: '' });
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientEntry[]>([]);

  useEffect(() => {
    if (!menuItemId) return;
    Promise.all([
      api.get<{ success: boolean; data: MenuItem }>(`/menu/items/${menuItemId}`),
      api.get<{ success: boolean; data: Ingredient[] }>('/inventory/ingredients?limit=200'),
      api.get<{ success: boolean; data: any[] }>(`/inventory/recipes?menuItemId=${menuItemId}`),
    ]).then(([menuRes, ingRes, recipeRes]) => {
      setMenuItem(menuRes.data);
      setIngredients(ingRes.data.filter((i) => i.isActive !== false));

      const existing = recipeRes.data[0];
      if (existing) {
        setForm({ name: existing.name || '', yield: existing.yield, instructions: existing.instructions || '' });
        setRecipeIngredients(
          existing.ingredients.map((ri: any) => ({
            ingredientId: ri.ingredient.id,
            quantity: ri.quantity,
            unit: ri.unit,
            notes: ri.notes || '',
          }))
        );
      }
      setLoading(false);
    }).catch((err) => { setError(err.message); setLoading(false); });
  }, [menuItemId]);

  const addIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { ingredientId: '', quantity: 1, unit: 'UNIDAD', notes: '' }]);
  };

  const removeIngredient = (idx: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx: number, field: string, value: any) => {
    const updated = [...recipeIngredients];
    (updated[idx] as any)[field] = value;
    if (field === 'ingredientId') {
      const ing = ingredients.find((i) => i.id === value);
      if (ing) updated[idx].unit = ing.unit;
    }
    setRecipeIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipeIngredients.length === 0) { setError(t('recipe.errorAddIngredient')); return; }
    if (recipeIngredients.some((ri) => !ri.ingredientId)) { setError(t('recipe.errorSelectIngredient')); return; }
    setSaving(true);
    setError(null);
    try {
      await api.put('/inventory/recipes', {
        menuItemId,
        ...form,
        yield: Number(form.yield),
        ingredients: recipeIngredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          quantity: Number(ri.quantity),
          unit: ri.unit,
          notes: ri.notes || undefined,
        })),
      });
      navigate(`/menu/items/${menuItemId}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>;
  if (!menuItem) return <p className="text-red-600">{t('recipe.notFound')}</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('recipe.title', { name: menuItem.name })}</h2>
      <p className="text-gray-500 mb-6">{t('recipe.subheading')}</p>

      {error && <p className="text-red-600 mb-4">{t('common.error')}: {error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-medium text-gray-800">{t('recipe.details')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('recipe.recipeName')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('recipe.recipeNamePlaceholder', { name: menuItem.name })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('recipe.yield')}</label>
              <input
                type="number"
                value={form.yield}
                onChange={(e) => setForm({ ...form, yield: Number(e.target.value) })}
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('recipe.instructions')}</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">{t('recipe.ingredients')}</h3>
            <button
              type="button"
              onClick={addIngredient}
              className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              + {t('recipe.addIngredient')}
            </button>
          </div>

          {recipeIngredients.length === 0 && (
            <p className="text-gray-400 text-sm py-4 text-center">{t('recipe.noIngredients')}</p>
          )}

          {recipeIngredients.map((ri, idx) => (
            <div key={idx} className="flex gap-3 items-start mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <select
                  value={ri.ingredientId}
                  onChange={(e) => updateIngredient(idx, 'ingredientId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t('recipe.selectIngredient')}</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.stock} {ing.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  value={ri.quantity}
                  onChange={(e) => updateIngredient(idx, 'quantity', Number(e.target.value))}
                  min={0.01}
                  step={0.1}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="w-28">
                <select
                  value={ri.unit}
                  onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                className="text-red-500 hover:text-red-700 pt-2"
                aria-label={t('recipe.removeIngredient')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? t('common.saving') : t('recipe.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/menu/items/${menuItemId}`)}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
