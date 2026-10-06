import { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Calendar,
  X,
  PackageCheck,
  Ban,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface PoLine {
  skuId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  lastReceivedAt?: string;
}

interface PurchaseOrder {
  poId: string;
  status: string;
  orderDate: string;
  expectedDate?: string;
  supplierId: string;
  supplierName: string;
  managerId?: string;
  warehouseStaffId?: string;
  totalAmount?: number;
  lines?: PoLine[];
}

interface SupplierOption {
  supplierId: string;
  name: string;
  isActive: boolean;
}

interface ProductOption {
  skuId: string;
  name: string;
  unitPrice: number;
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Administrator';
  const isWarehouse = user?.role === 'Warehouse Staff' || isManagerOrAdmin;

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePoDetails, setActivePoDetails] = useState<PurchaseOrder | null>(null);
  const [rejectingPoId, setRejectingPoId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiveLocation, setReceiveLocation] = useState('WH-01');

  // Create form options
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [orderQty, setOrderQty] = useState(10);
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/api/v1/purchase-orders';
      if (statusFilter) url += `?status=${encodeURIComponent(statusFilter)}`;
      const data = await apiRequest<PurchaseOrder[]>(url);
      setOrders(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [supData, prodData] = await Promise.all([
        apiRequest<SupplierOption[]>('/api/v1/suppliers'),
        apiRequest<ProductOption[]>('/api/v1/products'),
      ]);
      setSuppliers(supData.filter((s) => s.isActive));
      if (supData.length > 0) setSelectedSupplier(supData[0].supplierId);
      setProducts(prodData);
      if (prodData.length > 0) setSelectedSku(prodData[0].skuId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  useEffect(() => {
    if (showCreateModal) {
      fetchOptions();
    }
  }, [showCreateModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiRequest('/api/v1/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: selectedSupplier,
          expected_date: expectedDate,
          lines: [{ sku_id: selectedSku, quantity: Number(orderQty) }],
        }),
      });
      setSuccessMsg('Purchase Order draft created successfully (Status: Draft)');
      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create PO');
    }
  };

  const handleSubmit = async (poId: string) => {
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/purchase-orders/${poId}/submit`, { method: 'POST' });
      setSuccessMsg(`PO ${poId} submitted for approval`);
      fetchOrders();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
    }
  };

  const handleApprove = async (poId: string) => {
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/purchase-orders/${poId}/approve`, { method: 'POST' });
      setSuccessMsg(`PO ${poId} approved (Status: Approved)`);
      fetchOrders();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingPoId) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/purchase-orders/${rejectingPoId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setSuccessMsg(`PO ${rejectingPoId} rejected and reverted to Draft`);
      setRejectingPoId(null);
      setRejectReason('');
      fetchOrders();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  const handleCancel = async (poId: string) => {
    if (!window.confirm(`Are you sure you want to cancel PO ${poId}?`)) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/purchase-orders/${poId}/cancel`, { method: 'POST' });
      setSuccessMsg(`PO ${poId} cancelled`);
      fetchOrders();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const openReceiveModal = async (po: PurchaseOrder) => {
    try {
      const detailed = await apiRequest<PurchaseOrder>(`/api/v1/purchase-orders/${po.poId}`);
      setReceivingPo(detailed);
      const initialQtys: Record<string, number> = {};
      detailed.lines?.forEach((line) => {
        const remaining = Math.max(0, line.quantityOrdered - line.quantityReceived);
        initialQtys[line.skuId] = remaining;
      });
      setReceiveQtys(initialQtys);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load PO lines');
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;
    setErrorMsg(null);
    try {
      const payloadLines = Object.entries(receiveQtys).map(([skuId, qty]) => ({
        sku_id: skuId,
        quantity: Number(qty),
        location: receiveLocation,
      }));

      await apiRequest(`/api/v1/purchase-orders/${receivingPo.poId}/receive`, {
        method: 'POST',
        body: JSON.stringify({ lines: payloadLines }),
      });

      setSuccessMsg(`Stock receipt logged for PO ${receivingPo.poId}`);
      setReceivingPo(null);
      fetchOrders();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Receipt submission failed');
    }
  };

  const openDetailsModal = async (poId: string) => {
    try {
      const detailed = await apiRequest<PurchaseOrder>(`/api/v1/purchase-orders/${poId}`);
      setActivePoDetails(detailed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch PO details');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'Pending Approval':
        return 'bg-amber-950/70 text-amber-400 border-amber-800/60';
      case 'Approved':
        return 'bg-blue-950/70 text-blue-400 border-blue-800/60';
      case 'Partially Received':
        return 'bg-purple-950/70 text-purple-400 border-purple-800/60';
      case 'Received':
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60';
      case 'Cancelled':
        return 'bg-rose-950/70 text-rose-400 border-rose-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
            Purchase Orders & Procurement
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            6-state procurement lifecycle, multi-tier approvals, credit checks, and stock receipt (C2)
          </p>
        </div>
        {isManagerOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
        {[
          { label: 'All Orders', value: '' },
          { label: 'Draft', value: 'Draft' },
          { label: 'Pending Approval', value: 'Pending Approval' },
          { label: 'Approved', value: 'Approved' },
          { label: 'Partially Received', value: 'Partially Received' },
          { label: 'Received', value: 'Received' },
          { label: 'Cancelled', value: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === tab.value
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">PO Reference</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Assigned Staff</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No purchase orders found matching this filter.
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const isOverdue =
                    po.expectedDate &&
                    new Date(po.expectedDate) < new Date() &&
                    (po.status === 'Approved' || po.status === 'Partially Received');

                  return (
                    <tr key={po.poId} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white font-mono">{po.poId}</div>
                        {isOverdue && (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 font-bold mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>OVERDUE</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{po.supplierName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{po.supplierId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            po.status
                          )}`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Ordered: {po.orderDate}</span>
                        </div>
                        {po.expectedDate && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Expected: {po.expectedDate}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        <div>Mgr: {po.managerId || '—'}</div>
                        <div>Whs: {po.warehouseStaffId || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openDetailsModal(po.poId)}
                            title="View PO Details"
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Draft State Actions */}
                          {po.status === 'Draft' && isManagerOrAdmin && (
                            <button
                              onClick={() => handleSubmit(po.poId)}
                              className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 hover:bg-blue-800/80 border border-blue-700/60 text-[11px] font-medium transition"
                            >
                              Submit
                            </button>
                          )}

                          {/* Pending Approval Actions */}
                          {po.status === 'Pending Approval' && isManagerOrAdmin && (
                            <>
                              <button
                                onClick={() => handleApprove(po.poId)}
                                className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/80 border border-emerald-700/60 text-[11px] font-medium transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingPoId(po.poId)}
                                className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 border border-rose-800/60 text-[11px] font-medium transition"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* Receiving Actions */}
                          {(po.status === 'Approved' || po.status === 'Partially Received') &&
                            isWarehouse && (
                              <button
                                onClick={() => openReceiveModal(po)}
                                className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 hover:bg-purple-800/80 border border-purple-700/60 text-[11px] font-medium flex items-center space-x-1 transition"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Receive</span>
                              </button>
                            )}

                          {/* Cancel Action */}
                          {(po.status === 'Draft' ||
                            po.status === 'Pending Approval' ||
                            po.status === 'Approved') &&
                            isManagerOrAdmin && (
                              <button
                                onClick={() => handleCancel(po.poId)}
                                title="Cancel PO"
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
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

      {/* Create Purchase Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <span>Create Purchase Order Draft</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Supplier *
                </label>
                <select
                  required
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.name} ({s.supplierId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Product Item *
                </label>
                <select
                  required
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.skuId} value={p.skuId}>
                      {p.name} ({p.skuId}) — ₹{p.unitPrice}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Quantity Ordered *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition"
                >
                  Create PO Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPoId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Reject Purchase Order</span>
              </h3>
              <button onClick={() => setRejectingPoId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Provide a rejection reason. The order status will revert to Draft and a notification will be generated (D8).
            </p>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Total exceeds departmental budget cap"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setRejectingPoId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <PackageCheck className="w-4 h-4 text-purple-400" />
                  <span>Receive Inventory Shipment</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{receivingPo.poId} — {receivingPo.supplierName}</p>
              </div>
              <button onClick={() => setReceivingPo(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Target Warehouse Location *
                </label>
                <input
                  type="text"
                  required
                  value={receiveLocation}
                  onChange={(e) => setReceiveLocation(e.target.value)}
                  placeholder="WH-01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-400">
                  Line Items & Quantities to Receive:
                </label>
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  {receivingPo.lines?.map((line) => {
                    const remaining = Math.max(0, line.quantityOrdered - line.quantityReceived);
                    return (
                      <div key={line.skuId} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-white">{line.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{line.skuId}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Ordered: <span className="text-white font-medium">{line.quantityOrdered}</span> | Received so far:{' '}
                            <span className="text-purple-400 font-medium">{line.quantityReceived}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <label className="text-[10px] text-slate-500">Qty now:</label>
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={receiveQtys[line.skuId] ?? 0}
                            onChange={(e) =>
                              setReceiveQtys({ ...receiveQtys, [line.skuId]: Number(e.target.value) })
                            }
                            className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow transition"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {activePoDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  <span>Purchase Order Details</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{activePoDetails.poId}</p>
              </div>
              <button onClick={() => setActivePoDetails(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Supplier</span>
                <span className="font-semibold text-white">{activePoDetails.supplierName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Status</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${getStatusBadge(
                    activePoDetails.status
                  )}`}
                >
                  {activePoDetails.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Order Date</span>
                <span className="text-slate-300">{activePoDetails.orderDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Expected Delivery</span>
                <span className="text-slate-300">{activePoDetails.expectedDate || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Amount</span>
                <span className="text-emerald-400 font-bold">
                  ₹{Number(activePoDetails.totalAmount ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Line Items Breakdown
              </label>
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 divide-y divide-slate-800/80">
                {activePoDetails.lines?.map((line) => (
                  <div key={line.skuId} className="p-3 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{line.productName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{line.skuId}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Ordered: <span className="text-white">{line.quantityOrdered}</span> | Received:{' '}
                        <span className="text-emerald-400 font-semibold">{line.quantityReceived}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">₹{line.unitPrice} / unit</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Total: ₹{(line.quantityOrdered * line.unitPrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setActivePoDetails(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
