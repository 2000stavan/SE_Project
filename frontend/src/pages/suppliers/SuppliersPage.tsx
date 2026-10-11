import { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Building2, Plus, Search, Star, Clock, Mail, Edit2, PowerOff, History, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SupplierHistory {
  totalOrders: number;
  receivedOrders: number;
  onTimeRate: number;
  cancelledOrders: number;
  activeOrders: number;
  orders: { poId: string; status: string; orderDate: string; expectedDate: string; onTime: boolean | null }[];
}

interface Supplier {
  supplierId: string;
  name: string;
  contactDetails: string;
  rating: number;
  leadTime: number;
  procurementHistory: string;
  isActive: boolean;
}

const pageHeaderStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center',
  justifyContent: 'space-between', gap: 12,
  borderBottom: '1px solid var(--color-hairline)', paddingBottom: 20, marginBottom: 24,
};

export default function SuppliersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [history, setHistory] = useState<SupplierHistory | null>(null);

  const [name, setName] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [leadTime, setLeadTime] = useState(7);
  const [rating, setRating] = useState(4.0);

  // Debounced fetch — 300ms delay on search
  useEffect(() => {
    const timer = setTimeout(() => fetchSuppliers(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, minRating]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      let url = '/api/v1/suppliers';
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (minRating !== '') params.append('min_rating', minRating.toString());
      if (params.toString()) url += `?${params.toString()}`;
      const data = await apiRequest<Supplier[]>(url);
      setSuppliers(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiRequest('/api/v1/suppliers', { method: 'POST', body: JSON.stringify({ name: name.trim(), contactDetails: contactDetails.trim(), leadTime: Number(leadTime), rating: Number(rating), isActive: true }) });
      setSuccessMsg('Supplier registered successfully');
      setShowAddModal(false);
      resetForm();
      fetchSuppliers();
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Failed to create supplier'); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/suppliers/${editingSupplier.supplierId}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim(), contactDetails: contactDetails.trim(), leadTime: Number(leadTime), rating: Number(rating) }) });
      setSuccessMsg('Supplier updated');
      setEditingSupplier(null);
      resetForm();
      fetchSuppliers();
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Failed to update supplier'); }
  };

  const handleDeactivate = async (supplierId: string) => {
    if (!window.confirm('Deactivate supplier? (BR-5 safeguard applies — blocked if open POs exist)')) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/suppliers/${supplierId}/deactivate`, { method: 'POST' });
      setSuccessMsg('Supplier deactivated');
      fetchSuppliers();
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Cannot deactivate — open POs exist'); }
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContactDetails(sup.contactDetails);
    setLeadTime(sup.leadTime);
    setRating(sup.rating);
  };

  const resetForm = () => { setName(''); setContactDetails(''); setLeadTime(7); setRating(4.0); };

  const starRating = (r: number) => {
    const filled = Math.round(r);
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={11} strokeWidth={0} fill={i < filled ? '#f59e0b' : '#e3e8ee'} />
    ));
  };

  useEffect(() => {
    setHistory(null);
    if (!historySupplier) return;
    apiRequest<SupplierHistory>(`/api/v1/suppliers/${historySupplier.supplierId}/history`)
      .then(setHistory)
      .catch(() => setHistory(null));
  }, [historySupplier]);

  return (
    <div>
      {/* Header */}
      <div style={pageHeaderStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Building2 size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color: 'var(--color-ink)' }}>Supplier Directory</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
            Vendor management, ratings, lead times & procurement history (C2)
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary-sm">
          <Plus size={13} /> New Supplier
        </button>
      </div>

      {/* Messages */}
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

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-mute)' }} />
          <input className="input" style={{ paddingLeft: 32, fontSize: 14 }} type="text" placeholder="Search suppliers by name…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select className="input" style={{ flex: '0 1 180px', fontSize: 14 }} value={minRating} onChange={e => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">All Ratings</option>
          <option value="4.5">≥ 4.5 Stars</option>
          <option value="4.0">≥ 4.0 Stars</option>
          <option value="3.0">≥ 3.0 Stars</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Rating</th>
                <th>Lead Time</th>
                <th>Contact</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-ink-mute)', padding: 40 }}>Loading suppliers…</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-ink-mute)', padding: 40 }}>No suppliers match your criteria.</td></tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.supplierId}>
                    <td>
                      <div style={{ fontWeight: 400, color: 'var(--color-ink)', fontSize: 14 }}>{sup.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontFamily: 'monospace' }}>{sup.supplierId}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 2 }}>{starRating(sup.rating)}</div>
                        <span className="tnum" style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-ink)' }}>{Number(sup.rating).toFixed(2)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} color="var(--color-ink-mute)" />
                        <span className="tnum" style={{ fontSize: 14, color: 'var(--color-ink)' }}>{sup.leadTime}d</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 220 }}>
                        <Mail size={12} color="var(--color-ink-mute)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--color-ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.contactDetails}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill-tag ${sup.isActive ? 'pill-success' : 'pill-error'}`} style={{ fontSize: 9 }}>
                        {sup.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button onClick={() => setHistorySupplier(sup)} className="btn-ghost-sm" style={{ fontSize: 12 }} title="Procurement History"><History size={12} /></button>
                        <button onClick={() => openEditModal(sup)} className="btn-ghost-sm" style={{ fontSize: 12 }} title="Edit"><Edit2 size={12} /></button>
                        {isAdmin && sup.isActive && (
                          <button onClick={() => handleDeactivate(sup.supplierId)} className="btn-ghost-sm" style={{ fontSize: 12, color: 'var(--c-err-fg)', borderColor: 'var(--c-err-border)' }} title="Deactivate (BR-5)"><PowerOff size={12} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || editingSupplier) && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>{editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}</div>
              <button onClick={() => { setShowAddModal(false); setEditingSupplier(null); }} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 20 }} />
            <form onSubmit={editingSupplier ? handleEdit : handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Supplier Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Apex Global Distributors" className="input" style={{ fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Contact Details *</label>
                <textarea required rows={2} value={contactDetails} onChange={e => setContactDetails(e.target.value)} placeholder="orders@example.com, +1-555-0192" className="input" style={{ fontSize: 14, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Lead Time (days) *</label>
                  <input type="number" min={1} required value={leadTime} onChange={e => setLeadTime(Number(e.target.value))} className="input" style={{ fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Rating (0–5) *</label>
                  <input type="number" step="0.1" min={0} max={5} required value={rating} onChange={e => setRating(Number(e.target.value))} className="input" style={{ fontSize: 14 }} />
                </div>
              </div>
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingSupplier(null); }} className="btn-ghost-sm">Cancel</button>
                <button type="submit" className="btn-primary-sm">{editingSupplier ? 'Save Changes' : 'Create Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Procurement History Modal */}
      {historySupplier && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Procurement History</div>
                <div style={{ fontSize: 13, color: 'var(--color-ink-mute)', marginTop: 2 }}>{historySupplier.name}</div>
              </div>
              <button onClick={() => setHistorySupplier(null)} className="btn-ghost-sm" style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <hr className="divider" style={{ marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '12px 16px', background: 'var(--color-canvas-soft)', borderRadius: 8, border: '1px solid var(--color-hairline)' }}>
                <div style={{ fontSize: 10, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1px', marginBottom: 4 }}>RATING</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 2 }}>{starRating(historySupplier.rating)}</div>
                  <span className="tnum" style={{ fontWeight: 400, color: 'var(--color-ink)' }}>{Number(historySupplier.rating).toFixed(2)} / 5.0</span>
                </div>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--color-canvas-soft)', borderRadius: 8, border: '1px solid var(--color-hairline)' }}>
                <div style={{ fontSize: 10, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1px', marginBottom: 4 }}>AVG LEAD TIME</div>
                <span className="tnum" style={{ fontWeight: 400, color: 'var(--color-ink)', fontSize: 16 }}>{historySupplier.leadTime} days</span>
              </div>
            </div>
            {history && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    ['On-time rate', `${history.onTimeRate}%`],
                    ['Total POs', history.totalOrders],
                    ['Received', history.receivedOrders],
                    ['Cancelled', history.cancelledOrders],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={{ padding: '8px 10px', background: 'var(--color-canvas-soft)', borderRadius: 8, border: '1px solid var(--color-hairline)' }}>
                      <div style={{ fontSize: 9, color: 'var(--color-ink-mute)', textTransform: 'uppercase' }}>{label}</div>
                      <div className="tnum" style={{ fontSize: 16, color: 'var(--color-ink)' }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1px', marginBottom: 6 }}>Past purchase orders</div>
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--color-hairline)', borderRadius: 8 }}>
                  {history.orders.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: 'var(--color-ink-mute)' }}>No purchase orders yet.</div>
                  ) : history.orders.map((o) => (
                    <div key={o.poId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 12px', fontSize: 12, borderBottom: '1px solid var(--color-hairline)' }}>
                      <span>{o.poId}</span>
                      <span style={{ color: 'var(--color-ink-mute)' }}>{o.status}</span>
                      <span className="tnum" style={{ color: 'var(--color-ink-mute)' }}>due {o.expectedDate || '—'}</span>
                      <span style={{ color: o.onTime === null ? 'var(--color-ink-mute)' : o.onTime ? 'var(--c-ok-fg)' : 'var(--c-err-fg)' }}>
                        {o.onTime === null ? 'open' : o.onTime ? 'on time' : 'late/cancelled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1px', marginBottom: 8 }}>Performance Event Log (BR-4)</div>
              <div style={{ background: 'var(--color-canvas-soft)', border: '1px solid var(--color-hairline)', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--color-ink-secondary)', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {historySupplier.procurementHistory?.trim() || 'No past deliveries recorded yet. Rating updates appear here automatically on PO receipt.'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setHistorySupplier(null)} className="btn-ghost-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
