import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
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
  HelpCircle,
  ScrollText,
  LayoutDashboard,
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
  { label: 'Dashboard',          path: '/',                 icon: LayoutDashboard, roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'] },
  { label: 'Inventory',          path: '/inventory',        icon: Boxes,         roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'] },
  { label: 'Voice',              path: '/voice',            icon: Mic,           roles: ['Administrator', 'Manager', 'Warehouse Staff'] },
  { label: 'Suppliers',          path: '/suppliers',        icon: Building2,     roles: ['Administrator', 'Manager'] },
  { label: 'Purchase Orders',    path: '/purchase-orders',  icon: ClipboardList, roles: ['Administrator', 'Manager', 'Warehouse Staff'] },
  { label: 'Sales & POS',        path: '/sales',            icon: ShoppingCart,  roles: ['Administrator', 'Manager', 'Sales Personnel'] },
  { label: 'Forecast',           path: '/forecast',         icon: TrendingUp,    roles: ['Administrator', 'Manager'] },
  { label: 'Notifications',      path: '/notifications',    icon: Bell,          roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'] },
  { label: 'User Admin',         path: '/users',            icon: Users,         roles: ['Administrator'] },
  { label: 'Audit Log',          path: '/audit-log',        icon: ScrollText,    roles: ['Administrator'] },
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
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(path + '/');
  const current = allowedNav.find((i) => isActive(i.path))?.label ?? 'ISMS';

  return (
    <div className="app-shell">
      {mobileOpen && <div className="drawer-backdrop" onClick={() => setMobileOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <Link to="/" className="sidebar-brand" onClick={() => setMobileOpen(false)}>
          <Logo size={38} wordmark />
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} className={`nav-link${active ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Icon size={16} strokeWidth={active ? 2 : 1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* user card */}
        <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 12, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px', marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-nav-active-bg)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 13,
            }}>{user.name.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <span className={`pill-tag ${ROLE_PILL[user.role] || 'pill-neutral'}`} style={{ fontSize: 8, padding: '2px 6px' }}>{user.role}</span>
            </div>
          </div>
          <button onClick={() => logout()} className="nav-link" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <LogOut size={16} strokeWidth={1.6} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="app-main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="icon-btn show-mobile" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--color-ink)' }}>{current}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="icon-btn"
              onClick={() => window.dispatchEvent(new Event('isms:help'))}
              aria-label="Help and walkthrough"
              title="Help & walkthrough"
            >
              <HelpCircle size={15} />
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="page">{children}</main>
      </div>
    </div>
  );
}
