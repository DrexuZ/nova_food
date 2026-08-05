import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Category {
  id: string;
  name: string;
}

interface OptionValue {
  id: string;
  name: string;
  priceModifier: number;
}

interface MenuOption {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  values: OptionValue[];
}

interface MenuItemSummary {
  id: string;
  name: string;
  price: number;
  image: string | null;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number;
  category: { id: string; name: string };
  _count: { options: number };
}

interface MenuItemDetail extends MenuItemSummary {
  options: MenuOption[];
}

interface MenuItemResponse {
  success: boolean;
  data: MenuItemSummary[];
}

interface CartOption {
  menuOptionValueId: string;
  name: string;
  value: string;
  priceModifier: number;
}

interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  comment?: string;
  options: CartOption[];
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function OrderPos() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItemSummary[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [selected, setSelected] = useState<MenuItemDetail | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [selectedQty, setSelectedQty] = useState(1);
  const [itemModalLoading, setItemModalLoading] = useState(false);
  const [itemModalError, setItemModalError] = useState('');

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [orderType, setOrderType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [comment, setComment] = useState('');
  const [address, setAddress] = useState({ line1: '', city: '', state: '', zip: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: Category[] }>('/menu/categories'),
      api.get<MenuItemResponse>('/menu/items?limit=50'),
    ])
      .then(([catRes, itemRes]) => {
        setCategories(catRes.data ?? []);
        setItems(itemRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryId && it.category.id !== categoryId) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, categoryId]);

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  function resetItemModal() {
    setSelected(null);
    setSelectedOptions({});
    setSelectedQty(1);
    setItemModalError('');
  }

  function openItem(item: MenuItemSummary) {
    setItemModalLoading(true);
    setItemModalError('');
    api.get<{ success: boolean; data: MenuItemDetail }>(`/menu/items/${item.id}`)
      .then((res) => {
        setSelected(res.data);
        const initial: Record<string, string[]> = {};
        res.data.options.forEach((opt) => {
          if (opt.isRequired && opt.values.length > 0) initial[opt.id] = [opt.values[0].id];
        });
        setSelectedOptions(initial);
      })
      .catch((err) => setItemModalError(err.message))
      .finally(() => setItemModalLoading(false));
  }

  function toggleOption(opt: MenuOption, valueId: string) {
    setSelectedOptions((prev) => {
      const cur = prev[opt.id] || [];
      if (cur.includes(valueId)) {
        if (opt.isRequired && cur.length <= 1) return prev;
        return { ...prev, [opt.id]: cur.filter((id) => id !== valueId) };
      }
      const max = opt.maxSelect > 0 ? opt.maxSelect : cur.length + 1;
      const next = [...cur, valueId].slice(-max);
      return { ...prev, [opt.id]: next };
    });
  }

  function addSelectedToCart() {
    if (!selected) return;
    if (selected.trackStock && selected.stockQty < selectedQty) {
      setItemModalError(t('pos.insufficientStock'));
      return;
    }
    const lines: CartLine[] = [];
    for (let i = 0; i < selectedQty; i++) {
      let unitPrice = selected.price;
      const options: CartOption[] = [];
      for (const opt of selected.options) {
        const chosen = selectedOptions[opt.id] || [];
        const values = opt.values.filter((v) => chosen.includes(v.id));
        for (const v of values) {
          unitPrice += v.priceModifier;
          options.push({
            menuOptionValueId: v.id,
            name: opt.name,
            value: v.name,
            priceModifier: v.priceModifier,
          });
        }
      }
      lines.push({
        key: `${selected.id}-${i}-${Date.now()}`,
        menuItemId: selected.id,
        name: selected.name,
        unitPrice,
        quantity: 1,
        options,
      });
    }
    setCart((prev) => [...prev, ...lines]);
    resetItemModal();
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.key === key ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }

  function clearCart() {
    setCart([]);
    setGuestName('');
    setGuestPhone('');
    setComment('');
    setAddress({ line1: '', city: '', state: '', zip: '' });
    setOrderType('PICKUP');
    setSubmitError('');
    setCreatedOrderId(null);
  }

  function canSubmit() {
    if (cart.length === 0) return false;
    if (orderType === 'DELIVERY') {
      return address.line1 && address.city && address.state && address.zip;
    }
    return true;
  }

  async function submitOrder() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload: Record<string, unknown> = {
        orderType,
        items: cart.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          comment: line.comment,
          options: line.options,
        })),
        comment: comment || undefined,
        guestName: guestName || undefined,
        guestPhone: guestPhone || undefined,
      };
      if (orderType === 'DELIVERY') {
        payload.address = { ...address, line1: address.line1 };
      }
      const res = await api.post<{ success: boolean; data: { id: string; orderNumber: string } }>('/orders', payload);
      setCreatedOrderId(res.data.id);
      clearCart();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pos.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('pos.subtitle')}</p>
        </div>
        <Link to="/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          {t('pos.backToOrders')}
        </Link>
      </div>

      {createdOrderId && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-6 flex items-center justify-between">
          <span>{t('pos.orderCreated')}</span>
          <Link to={`/orders/${createdOrderId}`} className="text-sm font-medium underline">
            {t('pos.viewOrder')}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product picker */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('pos.searchPlaceholder')}
              className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">{t('pos.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          )}
          {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}
          {!loading && !error && filteredItems.length === 0 && (
            <p className="text-gray-500 text-center py-12">{t('pos.noItems')}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems
              .filter((it) => it.isActive)
              .map((it) => (
                <button
                  key={it.id}
                  onClick={() => openItem(it)}
                  className="border border-gray-200 rounded-xl p-3 text-left hover:border-primary-400 hover:shadow-sm transition-colors flex flex-col"
                  disabled={it.isActive && it.trackStock && it.stockQty <= 0}
                >
                  <div className="h-20 bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-2xl">🍽</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-800 line-clamp-2">{it.name}</span>
                  <span className="text-primary-600 font-semibold mt-1">{money(it.price)}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Cart / Checkout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">{t('pos.cart')}</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-gray-500 hover:text-red-600">{t('pos.clearCart')}</button>
            )}
          </div>

          {cart.length === 0 && !createdOrderId && (
            <p className="text-gray-400 text-sm text-center py-8">{t('pos.emptyCart')}</p>
          )}

          <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto mb-4">
            {cart.map((line) => (
              <div key={line.key} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-gray-800">{line.name}</span>
                  <button onClick={() => removeLine(line.key)} className="text-gray-400 hover:text-red-600 text-xs" aria-label="remove">✕</button>
                </div>
                {line.options.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
                    {line.options.map((o, idx) => <li key={idx}>{o.name}: {o.value}</li>)}
                  </ul>
                )}
                <div className="flex items-center justify-between mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(line.key, -1)} className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600">−</button>
                    <span className="w-5 text-center">{line.quantity}</span>
                    <button onClick={() => updateQty(line.key, 1)} className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600">+</button>
                  </div>
                  <span className="font-medium">{money(line.unitPrice * line.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-4 text-sm">
            <div className="text-gray-600">{t('pos.orderType')}:</div>
            <div className="flex gap-2">
              <button onClick={() => setOrderType('PICKUP')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${orderType === 'PICKUP' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-600'}`}>
                {t('orders.typePickup')}
              </button>
              <button onClick={() => setOrderType('DELIVERY')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${orderType === 'DELIVERY' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-600'}`}>
                {t('orders.typeDelivery')}
              </button>
            </div>

            {orderType === 'DELIVERY' && (
              <div className="space-y-2">
                <input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder={t('pos.addressLine1')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder={t('pos.addressCity')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                  <input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder={t('pos.addressState')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} placeholder={t('pos.addressZip')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
            )}

            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder={t('pos.guestName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder={t('pos.guestPhone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('pos.orderNote')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>{t('pos.subtotal')}</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>{t('pos.tax')}</span><span>{money(tax)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900 text-base"><span>{t('pos.total')}</span><span>{money(total)}</span></div>
          </div>

          {submitError && <div className="bg-red-50 text-red-700 p-3 rounded-lg mt-3 text-sm">{submitError}</div>}

          <button
            onClick={submitOrder}
            disabled={!canSubmit() || submitting}
            className="mt-4 w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {submitting ? t('pos.submitting') : t('pos.registerSale')}
          </button>
        </div>
      </div>

      {/* Item options modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={resetItemModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            {itemModalLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selected.name}</h3>
                    <span className="text-sm text-primary-600 font-medium">{money(selected.price)}</span>
                    {selected.trackStock && <span className="text-xs text-gray-500 ml-2">({t('pos.stock')}: {selected.stockQty})</span>}
                  </div>
                  <button onClick={resetItemModal} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {itemModalError && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-3 text-sm">{itemModalError}</div>}

                {selected.options.map((opt) => {
                  const chosen = selectedOptions[opt.id] || [];
                  return (
                    <div key={opt.id} className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {opt.name}
                        {opt.isRequired && <span className="text-red-500"> *</span>}
                        {opt.maxSelect > 0 && <span className="ml-1 text-xs text-gray-400">({t('pos.plural', { max: opt.maxSelect })})</span>}
                      </div>
                      <div className="space-y-1.5">
                        {opt.values.map((v) => {
                          const isChosen = chosen.includes(v.id);
                          return (
                            <label
                              key={v.id}
                              className={`flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer text-sm ${isChosen ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`}
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChosen}
                                  onChange={() => toggleOption(opt, v.id)}
                                  className="accent-indigo-600"
                                />
                                {v.name}
                              </span>
                              {v.priceModifier !== 0 && <span className="text-gray-500 text-xs">{v.priceModifier > 0 ? '+' : ''}{money(v.priceModifier)}</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {selected.options.length === 0 && (
                  <p className="text-gray-400 text-sm mb-4">{t('pos.noOptions')}</p>
                )}

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600">−</button>
                    <span className="w-6 text-center font-medium">{selectedQty}</span>
                    <button onClick={() => setSelectedQty(selectedQty + 1)} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600">+</button>
                  </div>
                  <button onClick={addSelectedToCart} className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg">
                    {t('pos.addToCart')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}