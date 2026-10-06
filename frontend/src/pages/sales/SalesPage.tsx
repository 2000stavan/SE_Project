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

  const loadProducts = async () => {
    try {
      const res = await apiRequest<{ data: any[] }>('/api/v1/products');
      if (res?.data) {
        setProducts(
          res.data.map((p) => ({
            sku_id: p.sku_id,
            name: p.name,
            unit_price: Number(p.unit_price || 0),
          }))
        );
      }
    } catch {
      // Products might be empty or restricted
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await apiRequest<{ data: SalesOrder[] }>('/api/v1/sales');
      setOrders(res.data || []);
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

      const res = await apiRequest<{ data: SalesOrder }>('/api/v1/sales/physical', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const orderId = res.data?.order_id;
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
  const openReturnModal = (order: SalesOrder) => {
    setReturnModalOrder(order);
    const initialQtys: Record<string, number> = {};
    order.lines.forEach((l) => {
      initialQtys[l.sku_id] = l.quantity;
    });
    setReturnQuantities(initialQtys);
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
      const res = await apiRequest<any>('/api/v1/dev/simulate-marketplace-order', {
        method: 'POST',
        body: JSON.stringify({
          marketplace: simMarketplace,
          sku_id: simSku.trim(),
          quantity: Number(simQty),
          price: Number(simPrice),
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-emerald-400" />
            Point of Sale & Sales Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Barcode POS scanner, stock deduction, PDF invoicing, returns, and marketplace webhook integration.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'pos' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            POS Terminal
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadOrders();
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'history' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Order History
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'simulator' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Marketplace Simulator
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          {lastInvoiceOrderId && (
            <button
              onClick={() => handleDownloadInvoice(lastInvoiceOrderId)}
              className="flex items-center gap-1 text-[11px] bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded font-medium transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Download Invoice PDF
            </button>
          )}
        </div>
      )}

      {/* TAB 1: POS TERMINAL */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Barcode Input & Cart */}
          <div className="lg:col-span-2 space-y-4">
            {/* Barcode scanner input */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <form onSubmit={handleBarcodeAdd} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode wedge or search product SKU / Name..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </form>

              {/* Quick Suggestions from existing catalog */}
              {products.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 self-center">Quick Add:</span>
                  {products.slice(0, 5).map((p) => (
                    <button
                      key={p.sku_id}
                      type="button"
                      onClick={() => addToCart(p.sku_id, p.name, p.unit_price)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700/60 transition"
                    >
                      {p.name} (${p.unit_price.toFixed(2)})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-slate-800 bg-slate-900/80 font-semibold text-xs text-slate-200">
                Cart Items ({cart.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/50 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Item / SKU</th>
                      <th className="py-2.5 px-4">Price</th>
                      <th className="py-2.5 px-4 text-center">Quantity</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          Cart is empty. Scan barcode wedge or select products above.
                        </td>
                      </tr>
                    ) : (
                      cart.map((line) => (
                        <tr key={line.sku_id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{line.name}</div>
                            <div className="text-[10px] font-mono text-emerald-400">{line.sku_id}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            ${line.unit_price.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.sku_id, line.quantity - 1)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-white">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.sku_id, line.quantity + 1)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            ${(line.quantity * line.unit_price).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => removeFromCart(line.sku_id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Payment & Checkout Summary */}
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Checkout & Payment
              </h3>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Lines count</span>
                  <span>{cart.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total quantity</span>
                  <span>{cart.reduce((s, i) => s + i.quantity, 0)} units</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Due</span>
                  <span className="text-emerald-400 font-mono text-base">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleCompleteSale}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-lg text-xs tracking-wide uppercase transition shadow-lg shadow-emerald-950/50"
              >
                {isSubmitting ? 'Processing & Locking Stock...' : 'Complete Physical Sale'}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                Completing sale logs transaction, locks & deducts inventory row, and generates PDF invoice.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">All Sales Orders</h2>
            <button
              onClick={loadOrders}
              disabled={loadingOrders}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No sales orders found. Complete a sale or simulate an order.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const isCompleted = order.status === 'Completed' || order.status === 'Paid';
                      const isReturned = order.status === 'Returned';

                      return (
                        <tr key={order.order_id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                            {order.order_id}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                              {order.channel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(order.order_date).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isCompleted
                                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                                  : isReturned
                                  ? 'bg-amber-950/50 text-amber-400 border-amber-800/50'
                                  : 'bg-rose-950/50 text-rose-400 border-rose-800/50'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {order.payment_method || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            ${Number(order.total_amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadInvoice(order.order_id)}
                                title="Download Invoice PDF"
                                className="text-slate-400 hover:text-emerald-400 p-1.5 rounded bg-slate-800/60 hover:bg-slate-800 transition"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              {isCompleted && !isReturned && (
                                <button
                                  type="button"
                                  onClick={() => openReturnModal(order)}
                                  title="Process Return"
                                  className="text-slate-400 hover:text-amber-400 p-1.5 rounded bg-slate-800/60 hover:bg-slate-800 transition"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MARKETPLACE SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Marketplace Webhook HMAC Simulator
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Test end-to-end inbound marketplace orders. The system signs payload payloads using
              HMAC-SHA256 (<span className="font-mono text-emerald-400">X-Signature</span> header),
              deducts stock immediately, and creates the order idempotently.
            </p>

            <form onSubmit={handleSimulateWebhook} className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Marketplace Channel
                </label>
                <select
                  value={simMarketplace}
                  onChange={(e) => setSimMarketplace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="amazon">Amazon (POST /webhook/amazon)</option>
                  <option value="shopify">Shopify (POST /webhook/shopify)</option>
                  <option value="flipkart">Flipkart (POST /webhook/flipkart)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Target Product SKU
                </label>
                <input
                  type="text"
                  value={simSku}
                  onChange={(e) => setSimSku(e.target.value)}
                  placeholder="e.g. SKU-1001 or select from catalog"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                {products.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {products.slice(0, 4).map((p) => (
                      <button
                        key={p.sku_id}
                        type="button"
                        onClick={() => {
                          setSimSku(p.sku_id);
                          setSimPrice(p.unit_price);
                        }}
                        className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 hover:text-white"
                      >
                        {p.sku_id}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={simQty}
                    onChange={(e) => setSimQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={simPrice}
                    onChange={(e) => setSimPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={simLoading || !simSku.trim()}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs tracking-wide transition flex items-center justify-center gap-2"
              >
                {simLoading ? 'Simulating HMAC Webhook...' : 'Fire HMAC-Signed Webhook'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Webhook Response & Signature Payload</h3>
            {simResult ? (
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[360px]">
                {JSON.stringify(simResult, null, 2)}
              </pre>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                Trigger a simulation to inspect the HMAC response payload
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Order Modal */}
      {returnModalOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Process Order Return ({returnModalOrder.order_id})
              </h3>
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="text-slate-500 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Return Reason
              </label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] text-slate-400 font-medium">
                Select Quantities to Restock:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {returnModalOrder.lines.map((line) => (
                  <div
                    key={line.sku_id}
                    className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-mono text-emerald-400 font-bold">{line.sku_id}</span>
                      <span className="text-slate-400 ml-2">(Max: {line.quantity})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-400">Qty:</label>
                      <input
                        type="number"
                        min={0}
                        max={line.quantity}
                        value={returnQuantities[line.sku_id] ?? line.quantity}
                        onChange={(e) =>
                          setReturnQuantities({
                            ...returnQuantities,
                            [line.sku_id]: Number(e.target.value),
                          })
                        }
                        className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center font-mono text-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReturning}
                onClick={handleProcessReturn}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs disabled:bg-slate-800"
              >
                {isReturning ? 'Processing Return...' : 'Confirm Return & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
