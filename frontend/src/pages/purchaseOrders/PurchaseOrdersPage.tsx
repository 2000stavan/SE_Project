import { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Calendar,
  X,
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Draft':              return 'pill-neutral';
      case 'Pending Approval':   return 'pill-warning';
      case 'Approved':           return 'pill-indigo';
      case 'Partially Received': return 'pill-dark';
      case 'Received':           return 'pill-success';
      case 'Cancelled':          return 'pill-error';
      default:                   return 'pill-neutral';
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--color-hairline)', paddingBottom: 20, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ClipboardList size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color: 'var(--color-ink)' }}>Purchase Orders & Procurement</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>6-state lifecycle, multi-tier approvals, credit checks & goods receipt (C2)</div>
        </div>
        {isManagerOrAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary-sm">
            <Plus size={13} /> Create PO
          </button>
        )}
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="banner-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={13} /></button>
        </div>
      )}
      {successMsg && (
        <div className="banner-success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={13} /></button>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {[
          { label: 'All', value: '' },
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
            style={{
              padding: '5px 14px', borderRadius: 'var(--radius-pill)',
              fontSize: 13, fontWeight: statusFilter === tab.value ? 400 : 300,
              border: statusFilter === tab.value ? '1px solid var(--color-primary)' : '1px solid var(--color-hairline)',
              backgroundColor: statusFilter === tab.value ? 'rgba(83,58,253,0.08)' : 'transparent',
              color: statusFilter === tab.value ? 'var(--color-primary)' : 'var(--color-ink-mute)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div style={{ border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Reference</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Dates</th>
                <th>Staff</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-ink-mute)', padding: 40 }}>Loading purchase orders…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-ink-mute)', padding: 40 }}>No purchase orders match this filter.</td></tr>
              ) : (
                orders.map((po) => {
                  const isOverdue = po.expectedDate && new Date(po.expectedDate) < new Date() && (po.status === 'Approved' || po.status === 'Partially Received');
                  return (
                    <tr key={po.poId}>
                      <td>
                        <div style={{ fontWeight: 400, color: 'var(--color-ink)', fontFamily: 'monospace', fontSize: 13 }}>{po.poId}</div>
                        {isOverdue && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#854d0e', marginTop: 2 }}><AlertTriangle size={10} />OVERDUE</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--color-ink)' }}>{po.supplierName}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontFamily: 'monospace' }}>{po.supplierId}</div>
                      </td>
                      <td><span className={`pill-tag ${getStatusClass(po.status)}`} style={{ fontSize: 9 }}>{po.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-ink-secondary)' }}>
                          <Calendar size={11} color="var(--color-ink-mute)" />
                          <span className="tnum">{po.orderDate}</span>
                        </div>
                        {po.expectedDate && <div className="tnum" style={{ fontSize: 11, color: 'var(--color-ink-mute)', marginTop: 2 }}>Exp: {po.expectedDate}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-ink-mute)' }}>
                        <div>Mgr: {po.managerId || '—'}</div>
                        <div>Whs: {po.warehouseStaffId || '—'}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => openDetailsModal(po.poId)} className="btn-ghost-sm" style={{ fontSize: 12 }} title="View"><Eye size={12} /></button>
                          {po.status === 'Draft' && isManagerOrAdmin && <button onClick={() => handleSubmit(po.poId)} className="btn-ghost-sm" style={{ fontSize: 12, color: 'var(--color-primary)', borderColor: 'var(--color-primary-bg-subdued)' }}>Submit</button>}
                          {po.status === 'Pending Approval' && isManagerOrAdmin && (
                            <>
                              <button onClick={() => handleApprove(po.poId)} className="btn-ghost-sm" style={{ fontSize: 12, color: '#166534', borderColor: '#bbf7d0' }}>Approve</button>
                              <button onClick={() => setRejectingPoId(po.poId)} className="btn-ghost-sm" style={{ fontSize: 12, color: '#b91c1c', borderColor: '#fca5a5' }}>Reject</button>
                            </>
                          )}
                          {(po.status === 'Approved' || po.status === 'Partially Received') && isWarehouse && (
                            <button onClick={() => openReceiveModal(po)} className="btn-ghost-sm" style={{ fontSize: 12 }}><Truck size={11} /> Receive</button>
                          )}
                          {(['Draft','Pending Approval','Approved'].includes(po.status)) && isManagerOrAdmin && (
                            <button onClick={() => handleCancel(po.poId)} className="btn-ghost-sm" style={{ fontSize: 12, color: '#b91c1c', borderColor: '#fca5a5' }} title="Cancel"><Ban size={11} /></button>
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
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Create Purchase Order Draft</div>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 20 }} />
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Supplier *</label>
                <select required value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="input" style={{ fontSize: 14 }}>
                  {suppliers.map((s) => <option key={s.supplierId} value={s.supplierId}>{s.name} ({s.supplierId})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Product Item *</label>
                <select required value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)} className="input" style={{ fontSize: 14 }}>
                  {products.map((p) => <option key={p.skuId} value={p.skuId}>{p.name} ({p.skuId}) — ₹{p.unitPrice}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Quantity *</label>
                  <input type="number" min={1} required value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))} className="input" style={{ fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Expected Date *</label>
                  <input type="date" required value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="input" style={{ fontSize: 14 }} />
                </div>
              </div>
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost-sm">Cancel</button>
                <button type="submit" className="btn-primary-sm">Create PO Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPoId && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Reject Purchase Order</div>
              <button onClick={() => setRejectingPoId(null)} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 14 }} />
            <p style={{ fontSize: 14, color: 'var(--color-ink-mute)', marginBottom: 14 }}>Provide a reason. The PO will revert to Draft and a notification will be sent.</p>
            <textarea required rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Total exceeds budget cap" className="input" style={{ fontSize: 14, resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setRejectingPoId(null)} className="btn-ghost-sm">Cancel</button>
              <button onClick={handleRejectConfirm} className="btn-primary-sm" style={{ backgroundColor: '#b91c1c' }}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {receivingPo && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Receive Inventory Shipment</div>
                <div style={{ fontSize: 13, color: 'var(--color-ink-mute)', marginTop: 2 }}>{receivingPo.poId} · {receivingPo.supplierName}</div>
              </div>
              <button onClick={() => setReceivingPo(null)} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 20 }} />
            <form onSubmit={handleReceiveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Target Warehouse Location *</label>
                <input type="text" required value={receiveLocation} onChange={(e) => setReceiveLocation(e.target.value)} placeholder="WH-01" className="input" style={{ fontSize: 14 }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 8 }}>Line Items & Quantities to Receive</div>
                <div style={{ border: '1px solid var(--color-hairline)', borderRadius: 8, overflow: 'hidden' }}>
                  {receivingPo.lines?.map((line) => {
                    const remaining = Math.max(0, line.quantityOrdered - line.quantityReceived);
                    return (
                      <div key={line.skuId} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--color-hairline)' }}>
                        <div>
                          <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--color-ink)' }}>{line.productName}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontFamily: 'monospace' }}>{line.skuId}</div>
                          <div className="tnum" style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginTop: 2 }}>Ordered: {line.quantityOrdered} · Received: {line.quantityReceived}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 11, color: 'var(--color-ink-mute)' }}>Qty now:</label>
                          <input type="number" min={0} max={remaining} value={receiveQtys[line.skuId] ?? 0} onChange={(e) => setReceiveQtys({ ...receiveQtys, [line.skuId]: Number(e.target.value) })} className="input" style={{ width: 80, fontSize: 14, textAlign: 'right' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setReceivingPo(null)} className="btn-ghost-sm">Cancel</button>
                <button type="submit" className="btn-primary-sm">Confirm Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {activePoDetails && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Purchase Order Details</div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontFamily: 'monospace', marginTop: 2 }}>{activePoDetails.poId}</div>
              </div>
              <button onClick={() => setActivePoDetails(null)} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[{label:'Supplier',val:activePoDetails.supplierName},{label:'Status',val:<span className={`pill-tag ${getStatusClass(activePoDetails.status)}`} style={{fontSize:9}}>{activePoDetails.status}</span>},{label:'Order Date',val:<span className="tnum">{activePoDetails.orderDate}</span>},{label:'Expected',val:<span className="tnum">{activePoDetails.expectedDate||'—'}</span>},{label:'Total Amount',val:<span className="tnum" style={{fontWeight:400,color:'var(--color-primary)'}}>₹{Number(activePoDetails.totalAmount??0).toLocaleString()}</span>}].map(({label,val})=>(
                <div key={label} style={{padding:'10px 14px',background:'var(--color-canvas-soft)',borderRadius:8,border:'1px solid var(--color-hairline)'}}>
                  <div style={{fontSize:10,color:'var(--color-ink-mute)',textTransform:'uppercase',letterSpacing:'0.1px',marginBottom:4}}>{label}</div>
                  <div style={{fontSize:14,fontWeight:400,color:'var(--color-ink)'}}>{val as any}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 8 }}>Line Items</div>
            <div style={{ border: '1px solid var(--color-hairline)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
              {activePoDetails.lines?.map((line) => (
                <div key={line.skuId} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-hairline)' }}>
                  <div>
                    <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--color-ink)' }}>{line.productName}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-ink-mute)' }}>{line.skuId}</div>
                    <div className="tnum" style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginTop: 2 }}>Ordered: {line.quantityOrdered} · Received: {line.quantityReceived}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tnum" style={{ fontWeight: 400, color: 'var(--color-ink)', fontSize: 14 }}>₹{line.unitPrice}/unit</div>
                    <div className="tnum" style={{ fontSize: 12, color: 'var(--color-ink-mute)' }}>₹{(line.quantityOrdered * line.unitPrice).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActivePoDetails(null)} className="btn-ghost-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
