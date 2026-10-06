import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Unlock,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  X,
  Search
} from 'lucide-react';

interface UserItem {
  userId: string;
  user_id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface SystemSettings {
  approval_limit_manager: number;
  supplier_credit_limit: number;
  max_failed_attempts: number;
  lockout_window_minutes: number;
  session_idle_minutes: number;
  voice_confidence_threshold: number;
  audio_alert_max_volume: number;
  tax_rate: number;
  storage_directory: string;
}

const ROLES = ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: '',
    name: '',
    email: '',
    role: 'Warehouse Staff',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Role Modal State
  const [editRoleUser, setEditRoleUser] = useState<UserItem | null>(null);
  const [newRole, setNewRole] = useState('');

  // Onboarding Guide Modal State (UD-1, UD-2)
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadUsers();
    loadSettings();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<UserItem[]>('/api/v1/users');
      setUsers(res || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await apiRequest<SystemSettings>('/api/v1/settings');
      setSettings(res || null);
    } catch {
      // settings might fail if not admin or network
    }
  };

  // Form Validation (UI-4)
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!createForm.user_id.trim()) {
      errors.user_id = 'User ID is required (e.g. USR-001)';
    } else if (!/^[A-Za-z0-9-_]+$/.test(createForm.user_id.trim())) {
      errors.user_id = 'User ID can only contain letters, numbers, hyphens, and underscores';
    }

    if (!createForm.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!createForm.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(createForm.email.trim())) {
      errors.email = 'Invalid email address format';
    }

    if (!createForm.password) {
      errors.password = 'Password is required';
    } else if (createForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });

      setSuccessMsg(`User ${createForm.name} (${createForm.user_id}) created successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        user_id: '',
        name: '',
        email: '',
        role: 'Warehouse Staff',
        password: '',
      });
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign Role (E2.2)
  const handleAssignRole = async () => {
    if (!editRoleUser || !newRole) return;
    const uid = editRoleUser.userId || editRoleUser.user_id;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest(`/api/v1/users/${uid}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      setSuccessMsg(`Role for ${editRoleUser.name} updated to ${newRole}.`);
      setEditRoleUser(null);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role');
    }
  };

  // Toggle Status / Unlock User (E2.1)
  const handleToggleStatus = async (user: UserItem) => {
    const uid = user.userId || user.user_id;
    const targetStatus = user.status === 'Active' ? 'Inactive' : 'Active';

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest(`/api/v1/users/${uid}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });

      setSuccessMsg(
        targetStatus === 'Active'
          ? `User ${user.name} unlocked & activated.`
          : `User ${user.name} deactivated.`
      );
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.userId && u.userId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-purple-400" />
            User Administration & System Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage users, assign RBAC roles, unlock accounts, and view global system limits and environment properties.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs px-3 py-2 rounded-lg transition"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            Role Onboarding Guide
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-lg shadow-purple-950/40 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add New User
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-medium w-full sm:w-auto self-start">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'users' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          System Settings (Read-Only)
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user by name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Filter Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        {loading ? 'Loading users...' : 'No users match criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const uid = u.userId || u.user_id || '';
                      const isActive = u.status === 'Active';
                      const isLocked = u.status === 'Locked';

                      const roleBadge = {
                        Administrator: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
                        Manager: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
                        'Warehouse Staff': 'bg-amber-950/60 text-amber-400 border-amber-800/60',
                        'Sales Personnel': 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
                      }[u.role] || 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <tr key={uid} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">{uid}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadge}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isActive
                                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                                  : isLocked
                                  ? 'bg-rose-950/50 text-rose-400 border-rose-800/50'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditRoleUser(u);
                                  setNewRole(u.role);
                                }}
                                className="text-slate-400 hover:text-purple-400 p-1.5 rounded bg-slate-800/60 hover:bg-slate-800 transition"
                                title="Change Assigned Role"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded transition ${
                                  isActive
                                    ? 'text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-slate-800'
                                    : 'text-amber-400 hover:text-emerald-400 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/50'
                                }`}
                                title={isActive ? 'Deactivate User' : 'Activate & Unlock User'}
                              >
                                {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
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

      {/* TAB 2: SYSTEM CONFIGURATION (E2.4) */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Global System Parameters & Runtime Thresholds
            </h2>
            <p className="text-xs text-slate-400">
              Per specification E2.4, these parameters are read-only environment controls configured in the deployment pipeline.
            </p>
          </div>

          {settings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Manager Approval Limit (BR-2)</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  ${Number(settings.approval_limit_manager).toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500">
                  POs exceeding this threshold require Administrator approval.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Supplier Credit Exposure Limit (BR-2)</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  ${Number(settings.supplier_credit_limit).toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500">
                  Maximum open PO balance permissible per supplier.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Account Lockout Policy</span>
                <div className="text-xl font-bold font-mono text-amber-400">
                  {settings.max_failed_attempts} Fails / {settings.lockout_window_minutes} Min Lock
                </div>
                <p className="text-[10px] text-slate-500">
                  Account temporarily locked on 5 consecutive failed logins.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Session Idle Sliding Timeout</span>
                <div className="text-xl font-bold font-mono text-blue-400">
                  {settings.session_idle_minutes} Minutes
                </div>
                <p className="text-[10px] text-slate-500">
                  JWT refreshed automatically on active requests; expires after idle duration.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Voice Recognition Confidence</span>
                <div className="text-xl font-bold font-mono text-teal-400">
                  {(Number(settings.voice_confidence_threshold) * 100).toFixed(0)}% Minimum
                </div>
                <p className="text-[10px] text-slate-500">
                  Lower confidence commands prompt for manual review or confirmation.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Audio Alert Max Volume (SA-2)</span>
                <div className="text-xl font-bold font-mono text-purple-400">
                  {(Number(settings.audio_alert_max_volume) * 100).toFixed(0)}% Ceiling
                </div>
                <p className="text-[10px] text-slate-500">
                  Web Audio alert decibel ceiling protection.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Invoice Storage Location</span>
                <div className="text-sm font-bold font-mono text-slate-200 truncate">
                  {settings.storage_directory}
                </div>
                <p className="text-[10px] text-slate-500">
                  Local filesystem repository for generated PDF sales invoices.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Sales Tax Rate</span>
                <div className="text-xl font-bold font-mono text-slate-200">
                  {(Number(settings.tax_rate) * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-slate-500">
                  Configured sales tax rate for billing calculations.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">Loading system configuration...</div>
          )}
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                Add New User
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  User ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. USR-STAFF-1"
                  value={createForm.user_id}
                  onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })}
                  className={`w-full bg-slate-950 border ${
                    formErrors.user_id ? 'border-rose-500' : 'border-slate-800'
                  } rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono`}
                />
                {formErrors.user_id && <p className="text-[10px] text-rose-400 mt-1">{formErrors.user_id}</p>}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={`w-full bg-slate-950 border ${
                    formErrors.name ? 'border-rose-500' : 'border-slate-800'
                  } rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500`}
                />
                {formErrors.name && <p className="text-[10px] text-rose-400 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. john@isms.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className={`w-full bg-slate-950 border ${
                    formErrors.email ? 'border-rose-500' : 'border-slate-800'
                  } rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500`}
                />
                {formErrors.email && <p className="text-[10px] text-rose-400 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Assigned Role <span className="text-rose-400">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Initial Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className={`w-full bg-slate-950 border ${
                    formErrors.password ? 'border-rose-500' : 'border-slate-800'
                  } rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono`}
                />
                {formErrors.password && <p className="text-[10px] text-rose-400 mt-1">{formErrors.password}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL (E2.2) */}
      {editRoleUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Assign Role: {editRoleUser.name}
              </h3>
              <button onClick={() => setEditRoleUser(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] text-slate-400 font-medium">Select RBAC Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditRoleUser(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignRole}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING & ROLE GUIDE MODAL (UD-1, UD-2) */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ISMS Role-Based Onboarding Guide</h3>
                  <p className="text-[10px] text-slate-400">UD-1 / UD-2 User Documentation & Quick-Start Walkthrough</p>
                </div>
              </div>
              <button onClick={() => setShowOnboarding(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-purple-800/40 bg-purple-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Administrator</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Responsible for user provisioning, RBAC role assignment, account unlocking, viewing global system thresholds, and supplier deactivation safeguards.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-800/40 bg-blue-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Manager</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Approves purchase orders up to $50,000.00, runs Holt-Winters demand forecasting, triggers automated 1-click PO drafts, and monitors revenue analytics.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-800/40 bg-amber-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Warehouse Staff</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Conducts hands-free voice-driven stock adjustments, confirms goods receipt from suppliers against open POs, and receives real-time low-stock alerts.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-800/40 bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sales Personnel</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Operates barcode-wedge POS terminal to log in-store sales, triggers automatic stock deductions, downloads PDF invoices, and processes customer returns.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowOnboarding(false)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
