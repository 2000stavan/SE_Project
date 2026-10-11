import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings2, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../api/client';

interface Pref {
  notificationType: string;
  emailEnabled: boolean;
  audioEnabled: boolean;
  smsEnabled: boolean;
}

const CHANNELS: { key: 'emailEnabled' | 'audioEnabled' | 'smsEnabled'; label: string }[] = [
  { key: 'emailEnabled', label: 'E-mail' },
  { key: 'audioEnabled', label: 'Audio alert' },
  { key: 'smsEnabled', label: 'SMS' },
];

// Notify.Preferences.Configure — per-type channel toggles
export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiRequest<Pref[]>('/api/v1/notifications/preferences')
      .then(setPrefs)
      .catch((e) => setMsg({ ok: false, text: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (type: string, key: 'emailEnabled' | 'audioEnabled' | 'smsEnabled') =>
    setPrefs((p) => p.map((x) => (x.notificationType === type ? { ...x, [key]: !x[key] } : x)));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      setPrefs(await apiRequest<Pref[]>('/api/v1/notifications/preferences', { method: 'PUT', body: JSON.stringify({ preferences: prefs }) }));
      setMsg({ ok: true, text: 'Preferences saved.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Link to="/notifications" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-ink-mute)', textDecoration: 'none', marginBottom: 12 }}>
        <ArrowLeft size={13} /> Back to notifications
      </Link>
      <div style={{ borderBottom: '1px solid var(--color-hairline)', paddingBottom: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Settings2 size={22} color="var(--color-primary)" strokeWidth={1.5} />
          <span className="text-heading-lg" style={{ color: 'var(--color-ink)' }}>Notification Preferences</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>Choose how you are alerted for each type of event.</div>
      </div>

      {msg && (
        <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 14, background: msg.ok ? 'var(--c-ok-bg)' : 'var(--c-err-bg)', color: msg.ok ? 'var(--c-ok-fg)' : 'var(--c-err-fg)' }}>
          {msg.ok && <CheckCircle2 size={16} />} {msg.text}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr><th>Event type</th>{CHANNELS.map((c) => <th key={c.key} style={{ textAlign: 'center' }}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--color-ink-mute)' }}>Loading…</td></tr>
            ) : prefs.map((p) => (
              <tr key={p.notificationType}>
                <td>{p.notificationType}</td>
                {CHANNELS.map((c) => (
                  <td key={c.key} style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label={`${p.notificationType} ${c.label}`}
                      checked={p[c.key]}
                      onChange={() => toggle(p.notificationType, c.key)}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={save} disabled={saving || loading} className="btn-primary"><Save size={13} /> {saving ? 'Saving…' : 'Save preferences'}</button>
      </div>
    </div>
  );
}
