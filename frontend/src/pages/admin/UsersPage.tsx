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
  Search,
} from 'lucide-react';

interface UserItem {
  userId: string;
  user_id?: string;
  name: string;
  email: string;
  role: string;
  status: string; // API values: active | inactive | locked
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

const ROLE_PILL: Record<string, string> = {
  Administrator: 'pill-dark',
  Manager: 'pill-indigo',
  'Warehouse Staff': 'pill-warning',
  'Sales Personnel': 'pill-success',
};

const ROLE_GUIDE: { role: string; text: string }[] = [
  { role: 'Administrator', text: 'Provisions users, assigns RBAC roles, unlocks accounts, reads the audit log and system limits, and is the only role that can deactivate a supplier (BR-5).' },
  { role: 'Manager', text: 'Creates and approves purchase orders up to the configured approval limit, manages suppliers, runs demand forecasts and creates one-click draft POs.' },
  { role: 'Warehouse Staff', text: 'Adjusts stock (by form or voice command), confirms goods receipt against purchase orders and receives low-stock alerts.' },
  { role: 'Sales Personnel', text: 'Uses the POS terminal to log physical sales, downloads PDF invoices and processes customer returns.' },
];

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

function statusOf(s: string) {
  const v = (s || '').toLowerCase();
  return { isActive: v === 'active', isLocked: v === 'locked', label: v ? v.charAt(0).toUpperCase() + v.slice(1) : '—' };
}

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
  const [createForm, setCreateForm] = useState({ user_id: '', name: '', email: '', role: 'Warehouse Staff', password: '' });
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
      setUsers((await apiRequest<UserItem[]>('/api/v1/users')) || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setSettings((await apiRequest<SystemSettings>('/api/v1/settings')) || null);
    } catch {
      // settings are admin-only; ignore otherwise
    }
  };

  // Inline form validation (UI-4)
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!createForm.user_id.trim()) errors.user_id = 'User ID is required (e.g. USR-001)';
    else if (!/^[A-Za-z0-9-_]+$/.test(createForm.user_id.trim())) errors.user_id = 'Only letters, numbers, hyphens and underscores';
    if (!createForm.name.trim()) errors.name = 'Full name is required';
    if (!createForm.email.trim()) errors.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(createForm.email.trim())) errors.email = 'Invalid email address format';
    if (!createForm.password) errors.password = 'Password is required';
    else if (createForm.password.length < 6) errors.password = 'Password must be at least 6 characters';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest('/api/v1/users', { method: 'POST', body: JSON.stringify(createForm) });
      setSuccessMsg(`User ${createForm.name} (${createForm.user_id}) created successfully.`);
      setShowCreateModal(false);
      setCreateForm({ user_id: '', name: '', email: '', role: 'Warehouse Staff', password: '' });
      setFormErrors({});
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign Role (Auth.RBAC.Assign, Administrator.assign_role)
  const handleAssignRole = async () => {
    if (!editRoleUser || !newRole) return;
    const uid = editRoleUser.userId || editRoleUser.user_id;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/api/v1/users/${uid}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
      setSuccessMsg(`Role for ${editRoleUser.name} updated to ${newRole}.`);
      setEditRoleUser(null);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role');
    }
  };

  // Deactivate an active user, or activate / unlock an inactive or locked one
  const handleToggleStatus = async (user: UserItem) => {
    const uid = user.userId || user.user_id;
    const activate = !statusOf(user.status).isActive;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/api/v1/users/${uid}/status`, { method: 'PATCH', body: JSON.stringify({ status: activate ? 'active' : 'inactive' }) });
      setSuccessMsg(activate ? `User ${user.name} unlocked & activated.` : `User ${user.name} deactivated.`);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user status');
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(q) || (u.userId || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchesSearch && (roleFilter ? u.role === roleFilter : true);
  });

  const fieldError = (k: string) => (formErrors[k] ? <div style={{ fontSize: 11, color: 'var(--c-err-fg)', marginTop: 4 }}>{formErrors[k]}</div> : null);
  const errStyle = (k: string): React.CSSProperties => (formErrors[k] ? { borderColor: 'var(--color-danger)' } : {});

  const settingCards = settings
    ? [
        { title: 'Manager approval limit (BR-2)', value: money(settings.approval_limit_manager), note: 'Purchase orders above this need an Administrator.' },
        { title: 'Supplier credit exposure limit (BR-2)', value: money(settings.supplier_credit_limit), note: 'Maximum open PO value per supplier.' },
        { title: 'Account lockout (SE-1)', value: `${settings.max_failed_attempts} fails / ${settings.lockout_window_minutes} min`, note: 'The account is locked after consecutive failed logins.' },
        { title: 'Session idle timeout', value: `${settings.session_idle_minutes} minutes`, note: 'Sliding JWT: refreshed on every request while active.' },
        { title: 'Voice confidence threshold', value: `${(Number(settings.voice_confidence_threshold) * 100).toFixed(0)}% minimum`, note: 'Below this the user is asked to repeat or use the form.' },
        { title: 'Audio alert volume cap (SA-2)', value: `${(Number(settings.audio_alert_max_volume) * 100).toFixed(0)}% ceiling`, note: 'Keeps warehouse alerts within safe volume.' },
        { title: 'Invoice storage', value: settings.storage_directory, note: 'Folder for generated PDF invoices.' },
        { title: 'Sales tax rate', value: `${(Number(settings.tax_rate) * 100).toFixed(1)}%`, note: 'Applied to invoices.' },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--color-hairline)', paddingBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Users size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color: 'var(--color-ink)' }}>User Administration</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
            Manage users, assign RBAC roles, unlock accounts and review system limits (Auth.RBAC, Administrator)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowOnboarding(true)} className="btn-ghost-sm"><HelpCircle size={13} /> Role guide</button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary-sm"><UserPlus size={13} /> Add New User</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--color-canvas-soft)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-pill)', padding: 4, alignSelf: 'flex-start' }}>
        {([
          { key: 'users', label: `User Directory (${users.length})`, icon: Users },
          { key: 'settings', label: 'System Settings (Read-Only)', icon: Sliders },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontSize: 13,
              fontWeight: activeTab === t.key ? 400 : 300, border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === t.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--color-ink-mute)',
            }}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {errorMsg && <div className="banner-error"><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {errorMsg}</div>}
      {successMsg && <div className="banner-success"><CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {successMsg}</div>}

      {/* TAB 1: USER DIRECTORY */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-ink-mute)' }} />
              <input className="input" style={{ paddingLeft: 34 }} placeholder="Search by name, ID or e-mail…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select className="select" style={{ width: 190 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>User ID</th><th>Assigned role</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 36, color: 'var(--color-ink-mute)' }}>{loading ? 'Loading users…' : 'No users match the criteria.'}</td></tr>
                ) : filteredUsers.map((u) => {
                  const uid = u.userId || u.user_id || '';
                  const st = statusOf(u.status);
                  return (
                    <tr key={uid}>
                      <td>
                        <div style={{ fontWeight: 400, color: 'var(--color-ink)' }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-ink-mute)' }}>{u.email}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{uid}</td>
                      <td><span className={`pill-tag ${ROLE_PILL[u.role] || 'pill-neutral'}`} style={{ fontSize: 9 }}>{u.role}</span></td>
                      <td>
                        <span className={`pill-tag ${st.isActive ? 'pill-success' : st.isLocked ? 'pill-error' : 'pill-neutral'}`} style={{ fontSize: 9 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button className="btn-icon" title="Change assigned role" aria-label={`Change role of ${u.name}`} onClick={() => { setEditRoleUser(u); setNewRole(u.role); }}>
                            <ShieldCheck size={14} />
                          </button>
                          <button className="btn-icon" title={st.isActive ? 'Deactivate user' : 'Activate & unlock user'} aria-label={st.isActive ? `Deactivate ${u.name}` : `Unlock ${u.name}`}
                            onClick={() => handleToggleStatus(u)}
                            style={st.isActive ? undefined : { color: 'var(--c-warn-fg)', borderColor: 'var(--c-warn-border)', background: 'var(--c-warn-bg)' }}>
                            {st.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM CONFIGURATION */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="banner-info">
            <Sliders size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            These parameters are read-only environment settings configured at deployment time.
          </div>
          {settings ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {settingCards.map((c) => (
                <div key={c.title} className="stat-card">
                  <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 8 }}>{c.title}</div>
                  <div className="tnum" style={{ fontSize: 20, color: 'var(--color-ink)', marginBottom: 6, wordBreak: 'break-word' }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontWeight: 300 }}>{c.note}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-mute)' }}>Loading system configuration…</div>
          )}
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box" role="dialog" aria-label="Add new user">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={16} color="var(--color-primary)" /> Add New User</div>
              <button onClick={() => { setShowCreateModal(false); setFormErrors({}); }} className="btn-ghost-sm" style={{ padding: '4px 8px' }} aria-label="Close"><X size={14} /></button>
            </div>
            <form onSubmit={handleCreateUser} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">User ID *</label>
                <input className="input" style={{ fontFamily: 'monospace', ...errStyle('user_id') }} placeholder="e.g. USR-STAFF-1" value={createForm.user_id} onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })} />
                {fieldError('user_id')}
              </div>
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input className="input" style={errStyle('name')} placeholder="e.g. John Doe" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                {fieldError('name')}
              </div>
              <div className="form-group">
                <label className="form-label">E-mail address *</label>
                <input className="input" type="email" style={errStyle('email')} placeholder="e.g. john@isms.com" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                {fieldError('email')}
              </div>
              <div className="form-group">
                <label className="form-label">Assigned role *</label>
                <select className="select" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Initial password *</label>
                <input className="input" type="password" style={errStyle('password')} placeholder="Minimum 6 characters" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
                {fieldError('password')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 6 }}>
                <button type="button" className="btn-ghost-sm" onClick={() => { setShowCreateModal(false); setFormErrors({}); }}>Cancel</button>
                <button type="submit" className="btn-primary-sm" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editRoleUser && (
        <div className="modal-overlay">
          <div className="modal-box" role="dialog" aria-label="Assign role" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={16} color="var(--color-primary)" /> Assign role: {editRoleUser.name}</div>
              <button onClick={() => setEditRoleUser(null)} className="btn-ghost-sm" style={{ padding: '4px 8px' }} aria-label="Close"><X size={14} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Select RBAC role</label>
              <select className="select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginTop: 4 }}>The new permissions apply from the user's next request.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16 }}>
              <button className="btn-ghost-sm" onClick={() => setEditRoleUser(null)}>Cancel</button>
              <button className="btn-primary-sm" onClick={handleAssignRole}>Update Role</button>
            </div>
          </div>
        </div>
      )}

      {/* ROLE GUIDE MODAL (UD-1, UD-2) */}
      {showOnboarding && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-lg" role="dialog" aria-label="Role guide">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>ISMS role guide</div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-mute)' }}>What each of the four roles can do (UD-1 / UD-2)</div>
              </div>
              <button onClick={() => setShowOnboarding(false)} className="btn-ghost-sm" style={{ padding: '4px 8px' }} aria-label="Close"><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {ROLE_GUIDE.map((g) => (
                <div key={g.role} className="card-sm">
                  <span className={`pill-tag ${ROLE_PILL[g.role]}`} style={{ fontSize: 9, marginBottom: 8 }}>{g.role}</span>
                  <div style={{ fontSize: 13, color: 'var(--color-ink-secondary)', fontWeight: 300, lineHeight: 1.5, marginTop: 6 }}>{g.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
              <button className="btn-primary-sm" onClick={() => setShowOnboarding(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
