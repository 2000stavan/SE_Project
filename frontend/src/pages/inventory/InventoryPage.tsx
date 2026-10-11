import { useState, useEffect, FormEvent } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Boxes, Search, Plus, RefreshCw, AlertTriangle, Radio, X } from 'lucide-react';

interface Product {
  skuId: string;
  name: string;
  category: string;
  unitPrice: number;
  reorderPoint: number;
  unitOfMeasure: string;
}

interface StockRecord {
  id: { skuId: string; locationId: string };
  quantityOnHand: number;
  quantityReserved: number;
  lastUpdated: string;
}

const pageHeaderStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center',
  justifyContent: 'space-between', gap: 12,
  borderBottom: '1px solid var(--color-hairline)', paddingBottom: 20, marginBottom: 24,
};

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<StockRecord | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustError, setAdjustError] = useState<string | null>(null);

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
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [categoryFilter]);

  // WebSocket live sync
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
              const idx = prev.findIndex(s => s.id.skuId === data.skuId && s.id.locationId === data.locationId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], quantityOnHand: data.quantityOnHand, lastUpdated: new Date().toISOString() };
                return next;
              }
              return prev;
            });
          }
        } catch { /* ignore */ }
      };
    } catch { /* ignore */ }
    return () => { if (socket) socket.close(); };
  }, []);

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await apiRequest('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify({ sku_id: newSku.trim(), name: newName.trim(), category: newCategory.trim() || 'General', unit_price: Number(newPrice), reorder_point: Number(newReorderPoint), unit_of_measure: newUom.trim() || 'PCS' }),
      });
      setShowCreateModal(false);
      setNewSku(''); setNewName(''); setNewCategory(''); setNewPrice(10); setNewReorderPoint(5); setNewUom('PCS');
      fetchData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  const handleAdjustStock = async () => {
    if (!showAdjustModal) return;
    setAdjustError(null);
    try {
      const current = showAdjustModal.quantityOnHand;
      await apiRequest(`/api/v1/stock/${showAdjustModal.id.skuId}/${showAdjustModal.id.locationId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity_on_hand: current + adjustDelta }),
      });
      setShowAdjustModal(null);
      setAdjustDelta(0);
      fetchData();
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : 'Adjustment failed');
    }
  };

  const getStockForProduct = (skuId: string) =>
    stocks.filter(s => s.id.skuId === skuId).reduce((sum, s) => sum + s.quantityOnHand, 0);

  const getReservedForProduct = (skuId: string) =>
    stocks.filter(s => s.id.skuId === skuId).reduce((sum, s) => sum + (s.quantityReserved ?? 0), 0);

  const getLowStockStyle = (skuId: string, reorderPoint: number) => {
    const qty = getStockForProduct(skuId);
    if (qty === 0)    return 'pill-error';
    if (qty <= reorderPoint) return 'pill-warning';
    return 'pill-success';
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={pageHeaderStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Boxes size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color: 'var(--color-ink)' }}>Inventory Management</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
            Products & stock levels · row-lock updates · real-time sync (C1)
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className={`pill-tag ${wsConnected ? 'pill-success' : 'pill-neutral'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Radio size={10} />
            {wsConnected ? 'Live' : 'Connecting…'}
          </span>
          <button onClick={fetchData} className="btn-ghost-sm" disabled={isLoading}>
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          {canEdit && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary-sm">
              <Plus size={13} />
              New Product
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-mute)' }} />
          <input
            className="input"
            style={{ paddingLeft: 32, fontSize: 14 }}
            type="text"
            placeholder="Search products…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
          />
        </div>
        <select
          className="input"
          style={{ flex: '0 1 180px', fontSize: 14 }}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={fetchData} className="btn-ghost-sm">
          <Search size={13} /> Search
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU / Product</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock on Hand</th>
                <th>Reserved</th>
                <th>Status</th>
                {canEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: 'var(--color-ink-mute)', padding: 40 }}>Loading inventory…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: 'var(--color-ink-mute)', padding: 40 }}>
                  <Boxes size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                  No products found. {canEdit && 'Create your first product above.'}
                </td></tr>
              ) : (
                products.map((p) => {
                  const totalStock = getStockForProduct(p.skuId);
                  const totalReserved = getReservedForProduct(p.skuId);
                  const statusClass = getLowStockStyle(p.skuId, p.reorderPoint);
                  return (
                    <tr key={p.skuId}>
                      <td>
                        <div style={{ fontWeight: 400, color: 'var(--color-ink)', fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontFamily: 'monospace' }}>{p.skuId}</div>
                      </td>
                      <td><span className="pill-tag pill-neutral" style={{ fontSize: 10 }}>{p.category || '—'}</span></td>
                      <td><span className="tnum" style={{ color: 'var(--color-ink)', fontWeight: 400 }}>₹{Number(p.unitPrice).toFixed(2)}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {totalStock === 0 && <AlertTriangle size={12} color="var(--color-ruby)" />}
                          <span className="tnum" style={{ fontWeight: 400, color: 'var(--color-ink)' }}>{totalStock}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-ink-mute)' }}>{p.unitOfMeasure}</span>
                        </div>
                      </td>
                      <td>
                        {totalReserved > 0
                          ? <span className="pill-tag pill-warning tnum" style={{ fontSize: 10 }}>{totalReserved}</span>
                          : <span style={{ color: 'var(--color-ink-mute)' }}>0</span>}
                      </td>
                      <td>
                        <span className={`pill-tag ${statusClass}`} style={{ fontSize: 9 }}>
                          {totalStock === 0 ? 'Out of Stock' : totalStock <= p.reorderPoint ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      {canEdit && (
                        <td style={{ textAlign: 'right' }}>
                          {stocks.filter(s => s.id.skuId === p.skuId).map(s => (
                            <button
                              key={`${s.id.skuId}-${s.id.locationId}`}
                              onClick={() => { setShowAdjustModal(s); setAdjustDelta(0); }}
                              className="btn-ghost-sm"
                              style={{ fontSize: 12 }}
                            >
                              Adjust · {s.id.locationId}
                            </button>
                          ))}
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

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Create New Product</div>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 20 }} />
            {createError && <div className="banner-error" style={{ marginBottom: 16 }}><AlertTriangle size={14} />{createError}</div>}
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'SKU ID *', val: newSku, set: setNewSku, ph: 'e.g. SKU-101' },
                { label: 'Name *',   val: newName, set: setNewName, ph: 'e.g. Laptop Bag' },
                { label: 'Category *', val: newCategory, set: setNewCategory, ph: 'e.g. Electronics' },
                { label: 'Unit of Measure *', val: newUom, set: setNewUom, ph: 'PCS' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>{label}</label>
                  <input required value={val} onChange={e => set(e.target.value)} placeholder={ph} className="input" style={{ fontSize: 14 }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Unit Price *</label>
                  <input type="number" step="0.01" min={0} required value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="input" style={{ fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Reorder Point *</label>
                  <input type="number" min={0} required value={newReorderPoint} onChange={e => setNewReorderPoint(Number(e.target.value))} className="input" style={{ fontSize: 14 }} />
                </div>
              </div>
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost-sm">Cancel</button>
                <button type="submit" className="btn-primary-sm">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Adjust Stock</div>
              <button onClick={() => setShowAdjustModal(null)} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 20 }} />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--color-ink-mute)', marginBottom: 2 }}>SKU · Location</div>
              <div style={{ fontWeight: 400, fontSize: 15, color: 'var(--color-ink)' }}>
                {showAdjustModal.id.skuId} · {showAdjustModal.id.locationId}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '12px 16px', background: 'var(--color-canvas-soft)', borderRadius: 8, border: '1px solid var(--color-hairline)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', marginBottom: 4 }}>CURRENT QTY</div>
                <div className="tnum" style={{ fontSize: 20, fontWeight: 400, color: 'var(--color-ink)' }}>{showAdjustModal.quantityOnHand}</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--color-canvas-soft)', borderRadius: 8, border: '1px solid var(--color-hairline)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', marginBottom: 4 }}>AFTER ADJUSTMENT</div>
                <div className="tnum" style={{ fontSize: 20, fontWeight: 400, color: adjustDelta < 0 && showAdjustModal.quantityOnHand + adjustDelta < 0 ? 'var(--color-ruby)' : 'var(--color-primary)' }}>
                  {showAdjustModal.quantityOnHand + adjustDelta}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 6 }}>Delta (+ to add, − to remove)</label>
              <input type="number" value={adjustDelta} onChange={e => setAdjustDelta(Number(e.target.value))} className="input" style={{ fontSize: 15 }} />
            </div>
            {adjustError && <div className="banner-error" style={{ marginBottom: 12 }}><AlertTriangle size={14} />{adjustError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAdjustModal(null)} className="btn-ghost-sm">Cancel</button>
              <button onClick={handleAdjustStock} className="btn-primary-sm">Apply Adjustment</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
