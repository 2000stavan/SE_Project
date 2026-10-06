import { useState, useEffect, FormEvent } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Boxes,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Radio,
  X,
} from 'lucide-react';

interface Product {
  skuId: string;
  name: string;
  category: string;
  unitPrice: number;
  reorderPoint: number;
  unitOfMeasure: string;
}

interface StockRecord {
  id: {
    skuId: string;
    locationId: string;
  };
  quantityOnHand: number;
  quantityReserved: number;
  lastUpdated: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<StockRecord | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // New product form
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState(10);
  const [newReorderPoint, setNewReorderPoint] = useState(5);
  const [newUom, setNewUom] = useState('PCS');
  const [createError, setCreateError] = useState<string | null>(null);

  const canEdit = user?.role === 'Administrator' || user?.role === 'Manager' || user?.role === 'Warehouse Staff';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const q = searchTerm ? `q=${encodeURIComponent(searchTerm)}` : '';
      const cat = categoryFilter ? `category=${encodeURIComponent(categoryFilter)}` : '';
      const params = [q, cat].filter(Boolean).join('&');

      const prodRes = await apiRequest<Product[]>(`/api/v1/products${params ? '?' + params : ''}`);
      const stockRes = await apiRequest<StockRecord[]>('/api/v1/stock');
      setProducts(prodRes);
      setStocks(stockRes);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter]);

  // Connect WebSocket for live stock sync (C1.5 / PE-2)
  useEffect(() => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws/stock`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setWsConnected(true);
      socket.onclose = () => setWsConnected(false);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'STOCK_UPDATE') {
            setStocks((prev) => {
              const existingIdx = prev.findIndex(
                (s) => s.id.skuId === data.skuId && s.id.locationId === data.locationId
              );
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = {
                  ...next[existingIdx],
                  quantityOnHand: data.quantityOnHand,
                  quantityReserved: data.quantityReserved,
                  lastUpdated: new Date().toISOString(),
                };
                return next;
              } else {
                return [
                  ...prev,
                  {
                    id: { skuId: data.skuId, locationId: data.locationId },
                    quantityOnHand: data.quantityOnHand,
                    quantityReserved: data.quantityReserved,
                    lastUpdated: new Date().toISOString(),
                  },
                ];
              }
            });
          }
        } catch {
          // ignore
        }
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (socket) socket.close();
    };
  }, []);

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await apiRequest('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify({
          sku_id: newSku.trim(),
          name: newName.trim(),
          category: newCategory.trim(),
          unit_price: Number(newPrice),
          reorder_point: Number(newReorderPoint),
          unit_of_measure: newUom.trim(),
        }),
      });
      setShowCreateModal(false);
      setNewSku('');
      setNewName('');
      setNewCategory('');
      fetchData();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  const handleAdjustStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal) return;
    setAdjustError(null);
    try {
      await apiRequest('/api/v1/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({
          sku: showAdjustModal.id.skuId,
          location: showAdjustModal.id.locationId,
          delta: Number(adjustDelta),
          reason: 'Manual adjustment from UI',
        }),
      });
      setShowAdjustModal(null);
      setAdjustDelta(0);
      fetchData();
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : 'Adjustment failed');
    }
  };

  const getStockForSku = (skuId: string) => {
    return stocks.filter((s) => s.id.skuId === skuId);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Boxes className="w-6 h-6 text-emerald-400" />
            <span>Inventory Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock tracking with pessimistic row locking and low-stock alerts
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
            <Radio className={`w-3 h-3 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className={wsConnected ? 'text-slate-300' : 'text-slate-500'}>
              {wsConnected ? 'WebSocket Live (<5s sync)' : 'Sync Standby'}
            </span>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            placeholder="Search by SKU or Product Name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Hardware">Hardware</option>
            <option value="Packaging">Packaging</option>
            <option value="Grocery">Grocery</option>
          </select>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">SKU / Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock by Location</th>
                <th className="py-3 px-4">Reorder Point</th>
                <th className="py-3 px-4">Status</th>
                {canEdit && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No products found. Add a product or seed demo data.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const skuStocks = getStockForSku(p.skuId);
                  const totalOnHand = skuStocks.reduce((sum, s) => sum + s.quantityOnHand, 0);
                  const isLow = totalOnHand < p.reorderPoint;

                  return (
                    <tr key={p.skuId} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.skuId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{p.category}</td>
                      <td className="py-3 px-4 font-mono font-medium">${Number(p.unitPrice).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {skuStocks.map((s) => (
                            <div key={s.id.locationId} className="flex items-center space-x-2 text-[11px]">
                              <span className="font-mono text-slate-400">{s.id.locationId}:</span>
                              <span className="font-bold text-white">{s.quantityOnHand}</span>
                              {s.quantityReserved > 0 && (
                                <span className="text-[10px] text-amber-400">({s.quantityReserved} res)</span>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setShowAdjustModal(s);
                                    setAdjustDelta(0);
                                  }}
                                  className="text-[10px] text-emerald-400 hover:underline ml-1"
                                >
                                  Adjust
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">{p.reorderPoint} {p.unitOfMeasure}</td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-950/70 text-rose-400 border border-rose-800/60">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                            Adequate
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              const whStock = skuStocks.find((s) => s.id.locationId === 'WH-01') || skuStocks[0];
                              if (whStock) {
                                setShowAdjustModal(whStock);
                                setAdjustDelta(0);
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition"
                          >
                            Update Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Adjust Stock (Pessimistic Lock)</h3>
              <button onClick={() => setShowAdjustModal(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="space-y-4 mt-4">
              <div className="text-xs text-slate-400">
                Product: <span className="text-white font-mono">{showAdjustModal.id.skuId}</span>
                <br />
                Location: <span className="text-white font-mono">{showAdjustModal.id.locationId}</span>
                <br />
                Current On Hand: <span className="text-emerald-400 font-bold">{showAdjustModal.quantityOnHand}</span>
              </div>

              {adjustError && (
                <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {adjustError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Delta (positive to add, negative to deduct)</label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  placeholder="e.g. +10 or -5"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(null)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Create New Product (C1.2)</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3 mt-4">
              {createError && (
                <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">SKU ID</label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="e.g. SKU-5001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Wireless Barcode Scanner"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newReorderPoint}
                    onChange={(e) => setNewReorderPoint(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={newUom}
                    onChange={(e) => setNewUom(e.target.value)}
                    placeholder="PCS"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
