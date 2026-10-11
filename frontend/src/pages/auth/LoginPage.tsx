import Logo from '../../components/Logo';
import ThemeToggle from '../../components/ThemeToggle';
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, UserCheck, Package, ShoppingCart, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface QuickAccount {
  label: string;
  id: string;
  role: string;
  icon: typeof ShieldCheck;
  accent: string;
}

const DEMO_ACCOUNTS: QuickAccount[] = [
  { label: 'Alice Admin',        id: 'USR-ADMIN-1',  role: 'Administrator',    icon: ShieldCheck,  accent: 'var(--color-brand-dark-900)' },
  { label: 'Bob Manager',        id: 'USR-MGR-1',    role: 'Manager',           icon: UserCheck,    accent: 'var(--color-primary)' },
  { label: 'Charlie Warehouse',  id: 'USR-WH-1',     role: 'Warehouse Staff',   icon: Package,      accent: '#9b6829' },
  { label: 'Dave Sales',         id: 'USR-SALES-1',  role: 'Sales Personnel',   icon: ShoppingCart, accent: '#166534' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please provide a User ID or Email');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await login({ user_id: identifier.trim(), password });
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (acc: QuickAccount) => {
    setIdentifier(acc.id);
    setPassword('Password123!');
    setError(null);
    setIsLoading(true);
    try {
      await login({ user_id: acc.id, password: 'Password123!' });
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="gradient-mesh" style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-canvas-soft)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 10 }}><ThemeToggle /></div>

      {/* Gradient mesh fills the top 50% */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
        pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 80% at 0% 0%,   rgba(245,233,212,0.85) 0%, transparent 55%),
          radial-gradient(ellipse 60% 60% at 25% 15%, rgba(251,191,36,0.40) 0%, transparent 50%),
          radial-gradient(ellipse 70% 70% at 65% 5%,  rgba(20,184,166,0.60)  0%, transparent 55%),
          radial-gradient(ellipse 50% 50% at 88% 20%, rgba(16,185,129,0.35)   0%, transparent 50%),
          radial-gradient(ellipse 100% 60% at 50% 50%,rgba(153,246,228,0.20) 0%, transparent 60%)`,
      }} />

      {/* Login card — floats over gradient */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }}>

        {/* Brand wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}><Logo size={56} /></div>
          <div className="text-display-md" style={{ color: 'var(--color-ink)', marginBottom: 6 }}>
            ISMS Sign In
          </div>
          <div style={{ fontSize: 15, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
            Inventory & Stock Management System — Release 1.0
          </div>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'var(--color-canvas)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-2)',
          padding: '32px 32px 28px',
        }}>

          {/* Quick demo sign-in */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.1px', textTransform: 'uppercase', color: 'var(--color-ink-mute)', marginBottom: 12 }}>
              Demo Accounts — 4 Roles
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    disabled={isLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-hairline)',
                      backgroundColor: 'var(--color-canvas-soft)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--color-primary-bg-subdued)'; el.style.backgroundColor = 'rgba(13,148,136,0.04)'; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--color-hairline)'; el.style.backgroundColor = 'var(--color-canvas-soft)'; }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      backgroundColor: `color-mix(in srgb, ${acc.accent} 14%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={14} color={acc.accent} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-ink)', lineHeight: 1.2 }}>{acc.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', lineHeight: 1.3 }}>{acc.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <hr className="divider" style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontWeight: 400 }}>or sign in manually</span>
            <hr className="divider" style={{ flex: 1 }} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="banner-error" style={{ marginBottom: 16 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 400, color: 'var(--color-ink-secondary)', marginBottom: 6 }}>
                User ID or Email
              </label>
              <input
                id="login-identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. USR-ADMIN-1 or admin@isms.com"
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 400, color: 'var(--color-ink-secondary)', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  style={{ paddingRight: 40 }}
                />
                <Lock size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-mute)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {isLoading ? 'Signing in…' : (
                <>
                  Sign In
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>
            <a href="/password-reset" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Forgot your password?</a>
          </div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--color-ink-mute)' }}>
            Demo password: <code style={{ fontWeight: 400, color: 'var(--color-ink-secondary)' }}>Password123!</code>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--color-ink-mute)' }}>
          ISMS · Release 1.0 · SE Project — Stavan Desai & Dev Gaglani
        </div>
      </div>
    </div>
  );
}
