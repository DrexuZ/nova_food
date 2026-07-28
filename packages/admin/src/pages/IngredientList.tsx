import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  stock: number;
  minStock: number;
  cost: number;
  category: string | null;
  isActive: boolean;
  locationId: string | null;
}

interface IngredientResponse {
  success: boolean;
  data: Ingredient[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function IngredientList() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchItems = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);

    api.get<IngredientResponse>(`/inventory/ingredients?${params}`)
      .then((res) => {
        setItems(res.data);
        setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    api.get<{ success: boolean; data: string[] }>('/inventory/ingredients/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchItems(1);
  }, [search, categoryFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ingredient "${name}"?`)) return;
    try {
      await api.delete(`/inventory/ingredients/${id}`);
      fetchItems(pagination.page);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const stockStatus = (item: Ingredient) => {
    if (item.stock <= 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-800' };
    if (item.minStock > 0 && item.stock <= item.minStock) return { label: 'Low Stock', cls: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', cls: 'bg-green-100 text-green-800' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Ingredients</h2>
        <Link
          to="/inventory/ingredients/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Add Ingredient
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Search ingredients"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      {!loading && items.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No ingredients found.</p>
          <Link to="/inventory/ingredients/new" className="text-primary-600 hover:text-primary-700 font-medium">
            Create your first ingredient
          </Link>
        </div>
      )}

      {loading && <p className="text-gray-500">Loading ingredients...</p>}

      {!loading && items.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.minStock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.cost.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                        <Link to={`/inventory/ingredients/${item.id}/edit`} className="text-primary-600 hover:text-primary-900 font-medium">
                          Edit
                        </Link>
                        <Link to={`/inventory/ingredients/${item.id}/stock`} className="text-blue-600 hover:text-blue-900 font-medium">
                          Stock
                        </Link>
                        <button onClick={() => handleDelete(item.id, item.name)} className="text-red-600 hover:text-red-900 font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">{pagination.total} items total</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchItems(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchItems(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
