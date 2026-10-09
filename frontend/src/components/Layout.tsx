import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  Users,
  Bell,
  Mic,
  LogOut,
  Building2,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: typeof Boxes;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inventory',          path: '/inventory',        icon: Boxes,         roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'] },
  { label: 'Voice',              path: '/voice',            icon: Mic,           roles: ['Administrator', 'Manager', 'Warehouse Staff'] },
  { label: 'Suppliers',          path: '/suppliers',        icon: Building2,     roles: ['Administrator', 'Manager'] },
  { label: 'Purchase Orders',    path: '/purchase-orders',  icon: ClipboardList, roles: ['Administrator', 'Manager', 'Warehouse Staff'] },
  { label: 'Sales & POS',        path: '/sales',            icon: ShoppingCart,  roles: ['Administrator', 'Manager', 'Sales Personnel'] },
  { label: 'Forecast',           path: '/forecast',         icon: TrendingUp,    roles: ['Administrator', 'Manager'] },
  { label: 'User Admin',         path: '/users',            icon: Users,         roles: ['Administrator'] },
  { label: 'Notifications',      path: '/notifications',    icon: Bell,          roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'] },
];

const ROLE_PILL: Record<string, string> = {
  Administrator:    'pill-dark',
  Manager:          'pill-indigo',
  'Warehouse Staff':'pill-warning',
  'Sales Personnel':'pill-success',
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Navigation Bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        backgroundColor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-hairline)',
        boxShadow: 'var(--shadow-1)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-soft) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 600, fontSize: 13, letterSpacing: '-0.3px',
              boxShadow: '0 2px 8px rgba(83,58,253,0.35)',
            }}>IS</div>
            <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--color-ink)', letterSpacing: '-0.2px' }}>ISMS</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto' }} className="hide-mobile">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 14, fontWeight: isActive ? 400 : 300,
                    color: isActive ? 'var(--color-primary)' : 'var(--color-ink-mute)',
                    backgroundColor: isActive ? 'rgba(83,58,253,0.08)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-canvas-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'; }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-ink-mute)'; } }}
                >
                  <Icon size={14} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: user info + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* Role + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hide-mobile">
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-ink)', lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', lineHeight: 1.2 }}>{user.email}</div>
              </div>
              <span className={`pill-tag ${ROLE_PILL[user.role] || 'pill-neutral'}`} style={{ fontSize: 9 }}>
                {user.role}
              </span>
            </div>

            {/* Help */}
            <a
              href="/README.md"
              target="_blank"
              rel="noreferrer"
              title="Documentation"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 'var(--radius-pill)',
                color: 'var(--color-ink-mute)', textDecoration: 'none',
                border: '1px solid var(--color-hairline)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-canvas-soft)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-ink-mute)'; (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            >
              <BookOpen size={14} />
            </a>

            {/* Sign out */}
            <button
              onClick={() => logout()}
              title="Sign out"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'transparent',
                color: 'var(--color-ink-mute)',
                fontSize: 13, fontWeight: 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = '#fca5a5'; el.style.color = '#b91c1c'; el.style.backgroundColor = '#fef2f2'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--color-hairline)'; el.style.color = 'var(--color-ink-mute)'; el.style.backgroundColor = 'transparent'; }}
            >
              <LogOut size={13} />
              <span className="hide-mobile">Sign out</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              className="show-mobile"
              onClick={() => setMobileOpen(v => !v)}
              style={{
                display: 'none', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8,
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'transparent', cursor: 'pointer',
                color: 'var(--color-ink)',
              }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileOpen && (
          <div style={{
            borderTop: '1px solid var(--color-hairline)',
            backgroundColor: 'var(--color-canvas)',
            padding: '12px 16px 16px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: 15, fontWeight: isActive ? 400 : 300,
                    color: isActive ? 'var(--color-primary)' : 'var(--color-ink)',
                    backgroundColor: isActive ? 'rgba(83,58,253,0.08)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </Link>
              );
            })}
            <hr className="divider" style={{ margin: '8px 0' }} />
            <div style={{ fontSize: 13, color: 'var(--color-ink-mute)', padding: '4px 12px' }}>
              {user.name} · {user.role}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main style={{
        flex: 1,
        maxWidth: 1280, width: '100%', margin: '0 auto',
        padding: '32px 24px',
      }}>
        {children}
      </main>

      {/* Responsive helpers */}
      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
