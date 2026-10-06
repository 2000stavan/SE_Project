import { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Plus,
  Search,
  Star,
  Clock,
  Mail,
  Edit2,
  PowerOff,
  History,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface Supplier {
  supplierId: string;
  name: string;
  contactDetails: string;
  rating: number;
  leadTime: number;
  procurementHistory: string;
  isActive: boolean;
}

export default function SuppliersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [leadTime, setLeadTime] = useState(7);
  const [rating, setRating] = useState(4.0);

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

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery, minRating]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiRequest('/api/v1/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          contactDetails: contactDetails.trim(),
          leadTime: Number(leadTime),
          rating: Number(rating),
          isActive: true,
        }),
      });
      setSuccessMsg('Supplier registered successfully');
      setShowAddModal(false);
      resetForm();
      fetchSuppliers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create supplier');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/suppliers/${editingSupplier.supplierId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          contactDetails: contactDetails.trim(),
          leadTime: Number(leadTime),
          rating: Number(rating),
        }),
      });
      setSuccessMsg('Supplier updated successfully');
      setEditingSupplier(null);
      resetForm();
      fetchSuppliers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update supplier');
    }
  };

  const handleDeactivate = async (supplierId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this supplier? (BR-5 applies)')) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/api/v1/suppliers/${supplierId}/deactivate`, {
        method: 'POST',
      });
      setSuccessMsg('Supplier deactivated successfully');
      fetchSuppliers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Cannot deactivate supplier (open POs exist)');
    }
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContactDetails(sup.contactDetails);
    setLeadTime(sup.leadTime);
    setRating(sup.rating);
  };

  const resetForm = () => {
    setName('');
    setContactDetails('');
    setLeadTime(7);
    setRating(4.0);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-emerald-400" />
            Supplier Directory & Performance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Vendor management, procurement tracking, rating indices, and lead times (C2)
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Supplier</span>
        </button>
      </div>

      {/* Messages */}
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

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search suppliers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Ratings</option>
            <option value="4.5">Rating ≥ 4.5 Stars</option>
            <option value="4.0">Rating ≥ 4.0 Stars</option>
            <option value="3.0">Rating ≥ 3.0 Stars</option>
            <option value="2.0">Rating ≥ 2.0 Stars</option>
          </select>
        </div>
      </div>

      {/* Supplier Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Supplier Name & ID</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Lead Time</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No suppliers match your search criteria.
                  </td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.supplierId} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{sup.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{sup.supplierId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-white">
                          {Number(sup.rating).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">/ 5.0</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{sup.leadTime} days</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1 text-slate-300 truncate max-w-xs">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{sup.contactDetails}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          sup.isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                        }`}
                      >
                        {sup.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setHistorySupplier(sup)}
                          title="View Procurement History"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(sup)}
                          title="Edit Supplier"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && sup.isActive && (
                          <button
                            onClick={() => handleDeactivate(sup.supplierId)}
                            title="Deactivate Supplier (BR-5)"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Supplier Modal */}
      {(showAddModal || editingSupplier) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>{editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}</span>
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSupplier(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingSupplier ? handleEdit : handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Global Distributors"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Contact Details (Email, Phone, Address) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={contactDetails}
                  onChange={(e) => setContactDetails(e.target.value)}
                  placeholder="orders@apexdistributors.com, +1-555-0192"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Lead Time (Days) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={leadTime}
                    onChange={(e) => setLeadTime(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Rating (0.00 – 5.00) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={5}
                    required
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSupplier(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition"
                >
                  {editingSupplier ? 'Save Changes' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Procurement History Modal */}
      {historySupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Procurement History & Quality Log</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{historySupplier.name} ({historySupplier.supplierId})</p>
              </div>
              <button onClick={() => setHistorySupplier(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">CURRENT RATING</span>
                  <span className="text-amber-400 font-bold flex items-center space-x-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{Number(historySupplier.rating).toFixed(2)} / 5.0</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">AVG LEAD TIME</span>
                  <span className="text-white font-bold mt-0.5 block">{historySupplier.leadTime} Days</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Performance Event Log (BR-4)
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {historySupplier.procurementHistory && historySupplier.procurementHistory.trim()
                    ? historySupplier.procurementHistory
                    : 'No past deliveries recorded yet. Rating updates will appear here automatically on PO receipt.'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setHistorySupplier(null)}
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
