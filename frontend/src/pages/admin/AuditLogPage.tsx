import { useState, useEffect, useMemo } from 'react';
import { ScrollText, RefreshCw, Search } from 'lucide-react';
import { apiRequest } from '../../api/client';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
}

const ACTION_TONE: Record<string, string> = {
  LOGIN_FAILED: 'pill-error',
  LOGIN: 'pill-success',
  STOCK_CHANGE: 'pill-warning',
};

// Auth.Audit.Log / SE-5 — Administrator-only viewer over /api/v1/admin/audit-log
export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (resource) qs.set('resource', resource);
      if (action) qs.set('action', action);
      setEntries(await apiRequest<AuditEntry[]>(`/api/v1/admin/audit-log?${qs}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resource, action]);

  const actions = useMemo(() => Array.from(new Set(entries.map((e) => e.action))).sort(), [entries]);
  const resources = useMemo(() => Array.from(new Set(entries.map((e) => e.resource))).sort(), [entries]);
  const shown = entries.filter((e) => !query || `${e.user_id} ${e.action} ${JSON.stringify(e.details ?? {})}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--color-hairline)', paddingBottom: 20, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ScrollText size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color: 'var(--color-ink)' }}>Audit Log</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
            Logins, role changes, stock, purchase-order and sales transactions (SE-5) — most recent 1000 events
          </div>
        </div>
        <button onClick={load} className="btn-ghost-sm" title="Refresh"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-ink-mute)' }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search user, action or detail…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input" style={{ width: 180 }} value={resource} onChange={(e) => setResource(e.target.value)}>
          <option value="">All resources</option>
          {resources.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input" style={{ width: 180 }} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {error && <div style={{ padding: 12, borderRadius: 8, background: 'var(--c-err-bg)', color: 'var(--c-err-fg)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Details</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-ink-mute)' }}>Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-ink-mute)' }}>No audit events match.</td></tr>
            ) : shown.map((e) => (
              <tr key={e.id}>
                <td><span className="tnum" style={{ fontSize: 12 }}>{new Date(e.timestamp).toLocaleString()}</span></td>
                <td>{e.user_id}</td>
                <td><span className={`pill-tag ${ACTION_TONE[e.action] ?? 'pill-neutral'}`} style={{ fontSize: 9 }}>{e.action}</span></td>
                <td>{e.resource}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-ink-secondary)', maxWidth: 360, wordBreak: 'break-word' }}>
                  {e.details && Object.keys(e.details).length ? JSON.stringify(e.details) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
