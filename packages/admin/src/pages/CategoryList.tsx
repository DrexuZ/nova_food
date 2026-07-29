import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  children: { id: string; name: string }[];
  _count: { menuItems: number };
}

export default function CategoryList() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Category[] }>('/menu/categories')
      .then((res) => { setCategories(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const topLevel = categories.filter((c) => !c.parentId);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('category.deleteConfirm', { name }))) return;
    try {
      await api.delete(`/menu/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('category.title')}</h2>
        <Link
          to="/menu/categories/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('category.addCategory')}
        </Link>
      </div>

      {loading && <p className="text-gray-500">{t('category.loading')}</p>}
      {error && <p className="text-red-600">{t('common.error')}: {error}</p>}

      {!loading && !error && topLevel.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">{t('category.noCategories')}</p>
          <Link to="/menu/categories/new" className="text-primary-600 hover:text-primary-700 font-medium">
            {t('category.createFirst')}
          </Link>
        </div>
      )}

      {!loading && topLevel.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category.items')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category.subcategories')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category.order')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topLevel.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                    <div className="text-xs text-gray-400">{cat.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat._count.menuItems}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat.children.length > 0
                      ? cat.children.map((c) => c.name).join(', ')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {cat.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat.sortOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <Link to={`/menu/categories/${cat.id}`} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={t('common.edit', { name: cat.name })}>
                      {t('common.edit')}
                    </Link>
                    <button onClick={() => handleDelete(cat.id, cat.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={t('common.delete', { name: cat.name })}>
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
