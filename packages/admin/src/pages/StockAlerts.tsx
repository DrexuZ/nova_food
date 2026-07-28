import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  category: string | null;
  cost: number;
}

export default function StockAlerts() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = () => {
    setLoading(true);
    api.get<{ success: boolean; data: Ingredient[] }>('/inventory/ingredients/alerts')
      .then((res) => {
        setItems(res.data);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { fetchAlerts(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Stock Alerts</h2>
        <button
          onClick={fetchAlerts}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      {loading && <p className="text-gray-500">Checking stock levels...</p>}

      {!loading && items.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-green-500 text-4xl mb-4">&#10003;</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">All Stock Levels Normal</h3>
          <p className="text-gray-500">No ingredients are below their minimum stock threshold.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-red-600 font-medium">
            {items.length} ingredient{items.length > 1 ? 's' : ''} below minimum stock
          </p>
          {items.map((item) => {
            const shortage = item.minStock - item.stock;
            const pct = item.minStock > 0 ? Math.round((item.stock / item.minStock) * 100) : 0;
            return (
              <div key={item.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    {item.category && <span className="text-xs text-gray-400">({item.category})</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-red-600 font-medium">{item.stock} {item.unit}</span>
                    <span className="text-gray-400">min: {item.minStock}</span>
                    <span className="text-gray-400">short: {shortage} {item.unit}</span>
                  </div>
                  <div className="mt-2 w-full max-w-xs bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    to={`/inventory/ingredients/${item.id}/stock`}
                    className="bg-primary-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-primary-700 transition-colors"
                  >
                    Add Stock
                  </Link>
                  <Link
                    to={`/inventory/ingredients/${item.id}/edit`}
                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
