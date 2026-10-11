import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { apiRequest } from '../../api/client';

// Auth.Password.Reset — two modes on one route:
//   /password-reset            → request a reset link by e-mail
//   /password-reset?token=XYZ  → choose a new password
export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (token) {
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      if (password !== confirm) return setError('Passwords do not match.');
    }
    setBusy(true);
    try {
      const res = token
        ? await apiRequest<{ message: string }>('/api/v1/auth/password-reset/confirm', {
            method: 'POST',
            body: JSON.stringify({ token, new_password: password }),
          })
        : await apiRequest<{ message: string }>('/api/v1/auth/password-reset/request', {
            method: 'POST',
            body: JSON.stringify({ email: email.trim() }),
          });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'fixed', top: 14, right: 14 }}><ThemeToggle /></div>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={20} color="var(--color-primary)" />
          <span className="text-heading-md" style={{ color: 'var(--color-ink)' }}>
            {token ? 'Choose a new password' : 'Reset your password'}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-ink-mute)', fontWeight: 300, marginBottom: 20 }}>
          {token
            ? 'Reset links are single-use and expire after 30 minutes.'
            : 'Enter your account e-mail and we will send a reset link (visible in Mailpit at localhost:8025 in the demo).'}
        </div>

        {done ? (
          <div>
            <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 8, background: 'var(--c-ok-bg)', color: 'var(--c-ok-fg)', fontSize: 13, marginBottom: 16 }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {done}
            </div>
            <Link to="/login" className="btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 8, background: 'var(--c-err-bg)', color: 'var(--c-err-fg)', fontSize: 13 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
              </div>
            )}
            {token ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>New password</label>
                  <input id="reset-password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>Confirm password</label>
                  <input id="reset-confirm" type="password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
              </>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-mute)', marginBottom: 5 }}>E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-ink-mute)' }} />
                  <input id="reset-email" type="email" required className="input" style={{ paddingLeft: 34 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                </div>
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-primary" style={{ justifyContent: 'center' }}>
              {busy ? 'Please wait…' : token ? 'Set new password' : 'Send reset link'}
            </button>
            <Link to="/login" style={{ fontSize: 13, color: 'var(--color-primary)', textAlign: 'center', textDecoration: 'none' }}>Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}
