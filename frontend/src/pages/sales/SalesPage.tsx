import React, { useState, useEffect } from 'react';
import { apiRequest, getStoredToken } from '../../api/client';
import {
  ShoppingCart,
  Plus,
  Trash2,
  FileText,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign
} from 'lucide-react';

interface ProductItem {
  sku_id: string;
  name: string;
  unit_price: number;
}

interface CartLine {
  sku_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface SalesOrderLine {
  id: number;
  sku_id: string;
  quantity: number;
  unit_price: number;
}

interface SalesOrder {
  order_id: string;
  channel: string;
  order_date: string;
  status: string;
  total_amount: number;
  payment_method: string;
  lines: SalesOrderLine[];
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'simulator'>('pos');
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // POS State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInvoiceOrderId, setLastInvoiceOrderId] = useState<string | null>(null);

  // Return Modal State
  const [returnModalOrder, setReturnModalOrder] = useState<SalesOrder | null>(null);
  const [returnReason, setReturnReason] = useState('Customer returned defective item');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [isReturning, setIsReturning] = useState(false);

  // Simulator State
  const [simMarketplace, setSimMarketplace] = useState('amazon');
  const [simSku, setSimSku] = useState('');
  const [simQty, setSimQty] = useState(1);
  const [simPrice, setSimPrice] = useState(29.99);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  // BUG FIX: /api/v1/products returns a plain array — was incorrectly unwrapping res?.data
  const loadProducts = async () => {
    try {
      const res = await apiRequest<ProductItem[]>('/api/v1/products');
      if (Array.isArray(res)) {
        setProducts(
          res.map((p: any) => ({
            sku_id: p.skuId || p.sku_id,
            name: p.name,
            unit_price: Number(p.unitPrice || p.unit_price || 0),
          }))
        );
      }
    } catch {
      // products list is non-critical — POS still works via manual entry
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      // API: plain array of order summaries (camelCase) with totalAmount; lines are loaded on demand for returns
      const res = await apiRequest<any[]>('/api/v1/sales');
      setOrders((Array.isArray(res) ? res : []).map((o) => ({
        order_id: o.orderId,
        channel: o.channel,
        order_date: o.createdAt,
        status: o.status,
        total_amount: Number(o.totalAmount || 0),
        payment_method: o.paymentReference || 'N/A',
        lines: [],
      })));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load sales orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Add item to POS Cart
  const handleBarcodeAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const term = barcodeInput.trim().toLowerCase();
    const product = products.find(
      (p) => p.sku_id.toLowerCase() === term || p.name.toLowerCase().includes(term)
    );

    if (!product) {
      // If product not found in cached list, add manually with fallback price
      addToCart(barcodeInput.trim(), barcodeInput.trim(), 19.99);
    } else {
      addToCart(product.sku_id, product.name, product.unit_price);
    }
    setBarcodeInput('');
  };

  const addToCart = (sku_id: string, name: string, unit_price: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.sku_id === sku_id);
      if (existing) {
        return prev.map((item) =>
          item.sku_id === sku_id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { sku_id, name, quantity: 1, unit_price }];
    });
  };

  const updateQuantity = (sku_id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(sku_id);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.sku_id === sku_id ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (sku_id: string) => {
    setCart((prev) => prev.filter((item) => item.sku_id !== sku_id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  // Submit POS Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        payment_method: paymentMethod,
        lines: cart.map((line) => ({
          sku_id: line.sku_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
        })),
      };

      const res = await apiRequest<{ orderId: string }>('/api/v1/sales/physical', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const orderId = res.orderId;
      setSuccessMsg(`Sale ${orderId} completed successfully! Stock deducted and invoice created.`);
      setLastInvoiceOrderId(orderId);
      setCart([]);
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Invoice PDF
  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/sales/${orderId}/invoice`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Invoice file could not be downloaded');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download invoice');
    }
  };

  // Open Return Modal
  const openReturnModal = async (order: SalesOrder) => {
    setErrorMsg(null);
    try {
      const d = await apiRequest<any>(`/api/v1/sales/${order.order_id}`);
      const lines: SalesOrderLine[] = (d.lines || []).map((l: any, i: number) => ({
        id: i,
        sku_id: l.skuId,
        quantity: l.quantity,
        unit_price: Number(l.unitPrice),
      }));
      const initialQtys: Record<string, number> = {};
      lines.forEach((l) => {
        initialQtys[l.sku_id] = l.quantity;
      });
      setReturnQuantities(initialQtys);
      setReturnModalOrder({ ...order, lines });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load order');
    }
  };

  // Process Return
  const handleProcessReturn = async () => {
    if (!returnModalOrder) return;
    setIsReturning(true);
    setErrorMsg(null);

    try {
      const lines = Object.entries(returnQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([sku_id, quantity]) => ({ sku_id, quantity }));

      if (lines.length === 0) {
        throw new Error('Please select at least 1 unit to return.');
      }

      await apiRequest(`/api/v1/sales/${returnModalOrder.order_id}/return`, {
        method: 'POST',
        body: JSON.stringify({
          reason: returnReason,
          lines,
        }),
      });

      setSuccessMsg(`Order ${returnModalOrder.order_id} returned. Restocked into inventory.`);
      setReturnModalOrder(null);
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process return');
    } finally {
      setIsReturning(false);
    }
  };

  // Simulate Marketplace Webhook
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSku.trim()) return;

    setSimLoading(true);
    setErrorMsg(null);
    setSimResult(null);

    try {
      const res = await apiRequest<any>(`/api/v1/sales/dev/simulate-marketplace-order?marketplace=${encodeURIComponent(simMarketplace)}`, {
        method: 'POST',
        body: JSON.stringify({
          order_id: `SIM-${Date.now()}`,
          event: 'order-paid',
          customer_info: `Simulated ${simMarketplace} buyer`,
          lines: [{ sku_id: simSku.trim(), quantity: Number(simQty), location_id: 'WH-01', unit_price: Number(simPrice) }],
        }),
      });
      setSimResult(res);
      setSuccessMsg(`Simulated HMAC-signed ${simMarketplace} order successfully processed!`);
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message || 'Marketplace simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, borderBottom:'1px solid var(--color-hairline)', paddingBottom:20, marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <ShoppingCart size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color:'var(--color-ink)' }}>Point of Sale & Sales Management</span>
          </div>
          <div style={{ fontSize:14, color:'var(--color-ink-mute)', fontWeight:300 }}>Barcode POS, stock deduction, PDF invoicing, returns & marketplace webhook (C3)</div>
        </div>
        {/* Tab switchers */}
        <div style={{ display:'flex', gap:4, backgroundColor:'var(--color-canvas-soft)', border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-pill)', padding:4 }}>
          {([{key:'pos',label:'POS Terminal'},{key:'history',label:'Order History'},{key:'simulator',label:'⚡ Simulator'}] as const).map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key as any); if(t.key==='history') loadOrders(); }}
              style={{ padding:'5px 14px', borderRadius:'var(--radius-pill)', fontSize:13, fontWeight: activeTab===t.key ? 400 : 300,
                backgroundColor: activeTab===t.key ? 'var(--color-primary)' : 'transparent',
                color: activeTab===t.key ? '#fff' : 'var(--color-ink-mute)',
                border:'none', cursor:'pointer', transition:'all 0.15s' }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="banner-error" style={{ marginBottom:16 }}>
          <AlertTriangle size={15} style={{ flexShrink:0 }} />
          <span style={{ flex:1 }}>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="banner-success" style={{ marginBottom:16 }}>
          <CheckCircle2 size={15} style={{ flexShrink:0 }} />
          <span style={{ flex:1 }}>{successMsg}</span>
          {lastInvoiceOrderId && (
            <button onClick={() => handleDownloadInvoice(lastInvoiceOrderId)} className="btn-primary-sm" style={{ fontSize:12 }}>
              <FileText size={12} /> Invoice PDF
            </button>
          )}
        </div>
      )}

      {/* TAB 1: POS TERMINAL */}
      {activeTab === 'pos' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:20 }} className="lg-grid-2">
          <style>{`.lg-grid-2 { } @media(min-width:1024px){.lg-grid-2{grid-template-columns:2fr 1fr;}}`}</style>
          {/* Left: Barcode + Cart */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Barcode scanner input */}
            <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:16, boxShadow:'var(--shadow-1)' }}>
              <form onSubmit={handleBarcodeAdd} style={{ display:'flex', gap:8 }}>
                <div style={{ position:'relative', flex:1 }}>
                  <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-ink-mute)' }} />
                  <input type="text" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode or search product SKU / Name…"
                    className="input" style={{ paddingLeft:32, fontSize:14, fontFamily:'monospace' }} autoFocus />
                </div>
                <button type="submit" className="btn-primary-sm"><Plus size={13} />Add</button>
              </form>
              {products.length > 0 && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--color-hairline)', display:'flex', flexWrap:'wrap', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'var(--color-ink-mute)', textTransform:'uppercase', letterSpacing:'0.1px' }}>Quick Add:</span>
                  {products.slice(0, 6).map(p => (
                    <button key={p.sku_id} type="button" onClick={() => addToCart(p.sku_id, p.name, p.unit_price)}
                      className="btn-ghost-sm" style={{ fontSize:12 }}>
                      {p.name} <span className="tnum">₹{p.unit_price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Cart Table */}
            <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow-1)' }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--color-hairline)', backgroundColor:'var(--color-canvas-soft)', fontSize:13, fontWeight:400, color:'var(--color-ink)' }}>
                Cart Items ({cart.length})
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Item / SKU</th><th>Unit Price</th><th style={{textAlign:'center'}}>Qty</th><th style={{textAlign:'right'}}>Subtotal</th><th style={{textAlign:'right'}}>Remove</th>
                  </tr></thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--color-ink-mute)', padding:40 }}>
                        Cart is empty. Scan a barcode wedge or use Quick Add above.
                      </td></tr>
                    ) : cart.map(line => (
                      <tr key={line.sku_id}>
                        <td>
                          <div style={{ fontWeight:400, color:'var(--color-ink)', fontSize:14 }}>{line.name}</div>
                          <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--color-primary)' }}>{line.sku_id}</div>
                        </td>
                        <td><span className="tnum" style={{ color:'var(--color-ink)' }}>₹{line.unit_price.toFixed(2)}</span></td>
                        <td style={{ textAlign:'center' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            <button type="button" onClick={() => updateQuantity(line.sku_id, line.quantity-1)}
                              style={{ width:24, height:24, borderRadius:6, border:'1px solid var(--color-hairline)', backgroundColor:'var(--color-canvas-soft)', cursor:'pointer', fontSize:14, fontWeight:400, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                            <span className="tnum" style={{ width:28, textAlign:'center', fontWeight:400, color:'var(--color-ink)', fontSize:14 }}>{line.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(line.sku_id, line.quantity+1)}
                              style={{ width:24, height:24, borderRadius:6, border:'1px solid var(--color-hairline)', backgroundColor:'var(--color-canvas-soft)', cursor:'pointer', fontSize:14, fontWeight:400, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                          </div>
                        </td>
                        <td style={{ textAlign:'right' }}><span className="tnum" style={{ fontWeight:400, color:'var(--color-ink)', fontSize:14 }}>₹{(line.quantity*line.unit_price).toFixed(2)}</span></td>
                        <td style={{ textAlign:'right' }}>
                          <button type="button" onClick={() => removeFromCart(line.sku_id)} className="btn-ghost-sm" style={{ color:'var(--c-err-fg)', borderColor:'var(--c-err-border)' }}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Right: Checkout panel */}
          <div>
            <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-1)', display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <DollarSign size={16} color="var(--color-primary)" strokeWidth={1.5} />
                <span style={{ fontSize:16, fontWeight:400, color:'var(--color-ink)' }}>Checkout & Payment</span>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--color-ink-mute)', marginBottom:6 }}>Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input" style={{ fontSize:14 }}>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <hr className="divider" />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--color-ink-mute)' }}><span>Lines</span><span className="tnum">{cart.length}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--color-ink-mute)' }}><span>Units</span><span className="tnum">{cart.reduce((s,i)=>s+i.quantity,0)}</span></div>
                <hr className="divider" />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <span style={{ fontSize:15, fontWeight:400, color:'var(--color-ink)' }}>Total Due</span>
                  <span className="tnum" style={{ fontSize:22, fontWeight:400, color:'var(--color-primary)' }}>₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>
              <button type="button" disabled={cart.length===0||isSubmitting} onClick={handleCompleteSale}
                className="btn-primary" style={{ width:'100%', justifyContent:'center', opacity: cart.length===0||isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? 'Processing…' : 'Complete Physical Sale'}
              </button>
              <div style={{ fontSize:11, color:'var(--color-ink-mute)', textAlign:'center' }}>Completes sale, locks stock, and generates PDF invoice</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER HISTORY */}
      {activeTab === 'history' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:16, fontWeight:400, color:'var(--color-ink)' }}>All Sales Orders</span>
            <button onClick={loadOrders} disabled={loadingOrders} className="btn-ghost-sm">
              <RefreshCw size={13} style={{ animation: loadingOrders ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
          <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow-1)' }}>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Order ID</th><th>Channel</th><th>Date</th><th>Status</th><th>Payment</th>
                  <th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>Actions</th>
                </tr></thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--color-ink-mute)', padding:40 }}>
                      No sales orders yet. Complete a POS sale or simulate a marketplace order.
                    </td></tr>
                  ) : orders.map(order => {
                    const isCompleted = order.status === 'Completed' || order.status === 'Paid';
                    const isReturned = order.status === 'Returned';
                    const statusClass = isReturned ? 'pill-warning' : isCompleted ? 'pill-success' : 'pill-neutral';
                    return (
                      <tr key={order.order_id}>
                        <td><span className="tnum" style={{ fontFamily:'monospace', color:'var(--color-primary)', fontWeight:400 }}>{order.order_id}</span></td>
                        <td><span className="pill-tag pill-neutral" style={{fontSize:9}}>{order.channel}</span></td>
                        <td><span className="tnum" style={{ fontSize:13, color:'var(--color-ink-mute)' }}>{new Date(order.order_date).toLocaleString()}</span></td>
                        <td><span className={`pill-tag ${statusClass}`} style={{fontSize:9}}>{order.status}</span></td>
                        <td style={{ fontSize:13, color:'var(--color-ink-secondary)' }}>{order.payment_method||'N/A'}</td>
                        <td style={{ textAlign:'right' }}><span className="tnum" style={{ fontWeight:400, color:'var(--color-ink)', fontSize:14 }}>₹{Number(order.total_amount).toFixed(2)}</span></td>
                        <td style={{ textAlign:'right' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4 }}>
                            <button type="button" onClick={() => handleDownloadInvoice(order.order_id)} className="btn-ghost-sm" style={{fontSize:12}} title="Invoice"><FileText size={12} /></button>
                            {isCompleted && !isReturned && (
                              <button type="button" onClick={() => openReturnModal(order)} className="btn-ghost-sm" style={{fontSize:12}} title="Return"><RotateCcw size={12} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MARKETPLACE SIMULATOR */}
      {activeTab === 'simulator' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }} className="sim-grid">
          <style>{`@media(max-width:768px){.sim-grid{grid-template-columns:1fr!important;}}`}</style>
          <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-1)', display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <Zap size={16} color="#9b6829" strokeWidth={1.5} />
                <span style={{ fontSize:16, fontWeight:400, color:'var(--color-ink)' }}>Marketplace HMAC Simulator</span>
              </div>
              <div style={{ fontSize:13, color:'var(--color-ink-mute)', fontWeight:300 }}>Simulates inbound marketplace orders signed with <code style={{fontSize:11,color:'var(--color-primary)'}}>HMAC-SHA256</code> via <code style={{fontSize:11,color:'var(--color-primary)'}}>X-Signature</code>. Deducts stock idempotently.</div>
            </div>
            <form onSubmit={handleSimulateWebhook} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--color-ink-mute)', marginBottom:5 }}>Marketplace Channel</label>
                <select value={simMarketplace} onChange={e => setSimMarketplace(e.target.value)} className="input" style={{fontSize:14}}>
                  <option value="amazon">Amazon (POST /webhook/amazon)</option>
                  <option value="shopify">Shopify (POST /webhook/shopify)</option>
                  <option value="flipkart">Flipkart (POST /webhook/flipkart)</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--color-ink-mute)', marginBottom:5 }}>Target Product SKU</label>
                <input type="text" value={simSku} onChange={e => setSimSku(e.target.value)} placeholder="e.g. SKU-001" className="input" style={{fontSize:14, fontFamily:'monospace'}} required />
                {products.length > 0 && (
                  <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
                    {products.slice(0,4).map(p => (
                      <button key={p.sku_id} type="button" onClick={() => {setSimSku(p.sku_id);setSimPrice(p.unit_price);}} className="btn-ghost-sm" style={{fontSize:11}}>{p.sku_id}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, color:'var(--color-ink-mute)', marginBottom:5 }}>Quantity</label>
                  <input type="number" min={1} value={simQty} onChange={e => setSimQty(Number(e.target.value))} className="input" style={{fontSize:14}} required />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, color:'var(--color-ink-mute)', marginBottom:5 }}>Price (₹)</label>
                  <input type="number" step="0.01" min={0.01} value={simPrice} onChange={e => setSimPrice(Number(e.target.value))} className="input" style={{fontSize:14}} required />
                </div>
              </div>
              <button type="submit" disabled={simLoading||!simSku.trim()} className="btn-primary" style={{justifyContent:'center'}}>
                {simLoading ? 'Simulating…' : '⚡ Fire HMAC-Signed Webhook'}
              </button>
            </form>
          </div>
          <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-1)', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:15, fontWeight:400, color:'var(--color-ink)' }}>Webhook Response & HMAC Payload</div>
            {simResult ? (
              <pre style={{ padding:12, backgroundColor:'var(--color-brand-dark-900)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:11, fontFamily:'monospace', color:'#a5f3fc', overflowX:'auto', maxHeight:360, flex:1 }}>{JSON.stringify(simResult, null, 2)}</pre>
            ) : (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed var(--color-hairline)', borderRadius:8, fontSize:13, color:'var(--color-ink-mute)', minHeight:200 }}>Fire a simulation to inspect the signed response payload</div>
            )}
          </div>
        </div>
      )}

      {/* Return Order Modal */}
      {returnModalOrder && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div className="text-heading-sm" style={{ color:'var(--color-ink)' }}>Process Order Return</div>
                <div style={{ fontSize:13, color:'var(--color-ink-mute)', marginTop:2 }}>{returnModalOrder.order_id}</div>
              </div>
              <button type="button" onClick={() => setReturnModalOrder(null)} className="btn-ghost-sm" style={{padding:'4px 8px'}}>✕</button>
            </div>
            <hr className="divider" style={{marginBottom:16}} />
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:12,color:'var(--color-ink-mute)',marginBottom:5}}>Return Reason</label>
              <input type="text" value={returnReason} onChange={e => setReturnReason(e.target.value)} className="input" style={{fontSize:14}} required />
            </div>
            <div>
              <div style={{fontSize:12,color:'var(--color-ink-mute)',marginBottom:8}}>Items restocked (the whole order is returned)</div>
              <div style={{ border:'1px solid var(--color-hairline)', borderRadius:8, overflow:'hidden', maxHeight:220, overflowY:'auto' }}>
                {returnModalOrder.lines.map(line => (
                  <div key={line.sku_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid var(--color-hairline)' }}>
                    <div>
                      <span style={{fontFamily:'monospace',fontSize:13,color:'var(--color-primary)',fontWeight:400}}>{line.sku_id}</span>
                      <span style={{fontSize:12,color:'var(--color-ink-mute)',marginLeft:8}}>(Max: {line.quantity})</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <label style={{fontSize:11,color:'var(--color-ink-mute)'}}>Qty:</label>
                      <input type="number" min={0} max={line.quantity} readOnly title="The whole order is returned and restocked" value={returnQuantities[line.sku_id]??line.quantity}
                        onChange={e => setReturnQuantities({...returnQuantities,[line.sku_id]:Number(e.target.value)})}
                        className="input" style={{width:72,fontSize:14,textAlign:'center'}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}>
              <button type="button" onClick={() => setReturnModalOrder(null)} className="btn-ghost-sm">Cancel</button>
              <button type="button" disabled={isReturning} onClick={handleProcessReturn} className="btn-primary-sm">
                {isReturning ? 'Processing…' : 'Confirm Return & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
