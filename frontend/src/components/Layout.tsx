import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import {
  Boxes, ClipboardList, ShoppingCart, TrendingUp,
  Users, Bell, Mic, LogOut, Building2, Menu, X,
  LayoutDashboard, ChevronRight, Settings,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface NavItem {
  label: string;
  path: string;
  icon: typeof Boxes;
  roles: string[];
  badge?: string;
  description?: string;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
  roles: string[];          // group only renders if user has any of these roles
}

/* ─── Navigation Config ─────────────────────────────────────── */
const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'],
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'], description: 'Home overview' },
    ],
  },
  {
    heading: 'Operations',
    roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'],
    items: [
      { label: 'Inventory',       path: '/inventory',       icon: Boxes,         roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'], description: 'Products & stock levels' },
      { label: 'Sales & POS',     path: '/sales',           icon: ShoppingCart,  roles: ['Administrator', 'Manager', 'Sales Personnel'], description: 'Point of sale & orders' },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList, roles: ['Administrator', 'Manager', 'Warehouse Staff'], description: 'Supplier purchase orders' },
      { label: 'Voice Commands',  path: '/voice',           icon: Mic,           roles: ['Administrator', 'Manager', 'Warehouse Staff'], description: 'Voice stock adjustments' },
    ],
  },
  {
    heading: 'Intelligence',
    roles: ['Administrator', 'Manager'],
    items: [
      { label: 'Forecasting',  path: '/forecast',  icon: TrendingUp, roles: ['Administrator', 'Manager'], description: 'Demand forecast & analytics' },
      { label: 'Suppliers',    path: '/suppliers', icon: Building2,  roles: ['Administrator', 'Manager'], description: 'Supplier management' },
    ],
  },
  {
    heading: 'Administration',
    roles: ['Administrator'],
    items: [
      { label: 'User Admin', path: '/users', icon: Users, roles: ['Administrator'], description: 'Manage users & system settings' },
    ],
  },
  {
    heading: 'Activity',
    roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'],
    items: [
      { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'], description: 'Alerts & system events' },
    ],
  },
];

/* ─── Role Metadata ─────────────────────────────────────────── */
const ROLE_CONFIG: Record<string, { color: string; bg: string; border: string; abbr: string; pillClass: string }> = {
  'Administrator':    { color: '#fff',               bg: '#1c1e54',             border: '#1c1e54',             abbr: 'AD', pillClass: 'pill-dark' },
  'Manager':          { color: '#4434d4',             bg: '#e8e6ff',             border: 'rgba(83,58,253,0.25)', abbr: 'MG', pillClass: 'pill-indigo' },
  'Warehouse Staff':  { color: '#854d0e',             bg: '#fef9c3',             border: '#fde68a',             abbr: 'WS', pillClass: 'pill-warning' },
  'Sales Personnel':  { color: '#166534',             bg: '#dcfce7',             border: '#bbf7d0',             abbr: 'SP', pillClass: 'pill-success' },
};

/* ─── Unread notification count hook ───────────────────────── */
function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    apiRequest<Array<{ status: string }>>('/api/v1/notifications')
      .then(data => setCount(data.filter(n => n.status === 'Unread').length))
      .catch(() => {});
    const id = setInterval(() => {
      apiRequest<Array<{ status: string }>>('/api/v1/notifications')
        .then(data => setCount(data.filter(n => n.status === 'Unread').length))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return count;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unread = useUnreadCount();

  if (!user) return <>{children}</>;

  const rc = ROLE_CONFIG[user.role] || ROLE_CONFIG['Manager'];

  // Flatten allowed items for top nav
  const allowedItems = NAV_GROUPS.flatMap(g =>
    g.roles.includes(user.role) ? g.items.filter(i => i.roles.includes(user.role)) : []
  );

  const handleLogout = () => { logout(); navigate('/login'); };

  /* Avatar initials */
  const initials = user.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : rc.abbr;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas-soft)' }}>

      {/* ════════════════════════════════════════════
          TOP NAVIGATION BAR
          ════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-hairline)',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{
          maxWidth: 1440, margin: '0 auto', padding: '0 20px',
          height: 'var(--nav-height)',
          display: 'flex', alignItems: 'center', gap: 0,
        }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 28, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #533afd 0%, #665efd 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '-0.5px',
              boxShadow: '0 2px 8px rgba(83,58,253,0.3)',
              flexShrink: 0,
            }}>IS</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>ISMS</div>
              <div style={{ fontSize: 10, color: 'var(--color-ink-mute)', letterSpacing: '0.02em', fontWeight: 400 }}>Inventory System</div>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, overflowX: 'auto' }}>
            {allowedItems.map(item => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const isNotifications = item.path === '/notifications';
              return (
                <Link key={item.path} to={item.path}
                  title={item.description}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 'var(--radius-md)',
                    fontSize: 13.5, fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--color-primary)' : 'var(--color-ink-mute)',
                    backgroundColor: isActive ? 'rgba(83,58,253,0.08)' : 'transparent',
                    textDecoration: 'none', whiteSpace: 'nowrap',
                    transition: 'all 0.15s', position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = 'var(--color-canvas-soft)'; el.style.color = 'var(--color-ink)'; }}}
                  onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = 'transparent'; el.style.color = 'var(--color-ink-mute)'; }}}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                  {isNotifications && unread > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 16, height: 16, borderRadius: 99,
                      background: 'var(--color-danger)', color: '#fff',
                      fontSize: 9, fontWeight: 700, padding: '0 4px',
                    }}>{unread > 9 ? '9+' : unread}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Right Controls ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>

            {/* Role badge + user info (desktop) */}
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', lineHeight: 1.2 }}>{user.email}</div>
              </div>
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--radius-md)',
                background: rc.bg, color: rc.color,
                border: `1.5px solid ${rc.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                flexShrink: 0, cursor: 'default',
              }} title={user.role}>{initials}</div>
            </div>

            {/* Role pill (desktop) */}
            <span className={`pill-tag ${rc.pillClass} hide-mobile`} style={{ fontSize: 9.5, padding: '3px 9px' }}>{user.role}</span>

            {/* Notifications shortcut */}
            <Link to="/notifications" style={{
              position: 'relative', width: 34, height: 34, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-hairline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-ink-mute)', textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background='var(--color-canvas-soft)'; el.style.color='var(--color-ink)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background=''; el.style.color='var(--color-ink-mute)'; }}
            >
              <Bell size={15} strokeWidth={1.8} />
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 16, height: 16, borderRadius: 99,
                  background: 'var(--color-danger)', color: '#fff',
                  fontSize: 9, fontWeight: 700, padding: '0 4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--color-canvas)',
                }}>{unread > 9 ? '9+' : unread}</span>
              )}
            </Link>

            {/* Logout */}
            <button onClick={handleLogout} title="Sign out" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-hairline)',
              background: 'transparent', color: 'var(--color-ink-mute)',
              fontSize: 13, fontWeight: 400, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#fca5a5'; el.style.color='#b91c1c'; el.style.background='#fef2f2'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='var(--color-hairline)'; el.style.color='var(--color-ink-mute)'; el.style.background='transparent'; }}
            >
              <LogOut size={13} strokeWidth={1.8} />
              <span className="hide-mobile">Sign out</span>
            </button>

            {/* Mobile hamburger */}
            <button
              className="show-mobile"
              onClick={() => setSidebarOpen(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-hairline)',
                background: 'transparent', color: 'var(--color-ink)',
                display: 'none', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* ── Mobile Dropdown ── */}
        {sidebarOpen && (
          <div style={{
            borderTop: '1px solid var(--color-hairline)',
            background: 'var(--color-canvas)',
            padding: '8px 12px 16px',
            animation: 'slideUp 0.18s ease',
          }}>
            {/* User info strip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px 14px',
              marginBottom: 8,
              borderBottom: '1px solid var(--color-hairline)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: rc.bg, color: rc.color,
                border: `1.5px solid ${rc.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>{initials}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)' }}>{user.role}</div>
              </div>
            </div>

            {/* Nav groups */}
            {NAV_GROUPS.filter(g => g.roles.includes(user.role)).map(group => {
              const groupItems = group.items.filter(i => i.roles.includes(user.role));
              if (!groupItems.length) return null;
              return (
                <div key={group.heading} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-ink-mute)', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '6px 10px 4px' }}>
                    {group.heading}
                  </div>
                  {groupItems.map(item => {
                    const Icon = item.icon;
                    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 10px', borderRadius: 'var(--radius-md)',
                          fontSize: 14, fontWeight: isActive ? 500 : 400,
                          color: isActive ? 'var(--color-primary)' : 'var(--color-ink)',
                          background: isActive ? 'rgba(83,58,253,0.08)' : 'transparent',
                          textDecoration: 'none', marginBottom: 2,
                        }}>
                        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                        {item.label}
                        {item.path === '/notifications' && unread > 0 && (
                          <span style={{ marginLeft: 'auto', background: 'var(--color-danger)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 6px' }}>{unread}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 10, marginTop: 4 }}>
              <button onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '9px 10px', borderRadius: 'var(--radius-md)',
                  fontSize: 14, fontWeight: 400, color: 'var(--color-danger)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                }}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════════
          ROLE CONTEXT BANNER (below nav)
          ════════════════════════════════════════════ */}
      <div style={{
        background: rc.bg,
        borderBottom: `1px solid ${rc.border}`,
        padding: '6px 20px',
      }}>
        <div style={{
          maxWidth: 1440, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: rc.color, fontWeight: 400 }}>
            <Settings size={11} strokeWidth={2} />
            <span>
              Logged in as <strong>{user.role}</strong>
              {user.role === 'Administrator' && ' · Full system access'}
              {user.role === 'Manager' && ' · Approvals, forecasting, suppliers'}
              {user.role === 'Warehouse Staff' && ' · Inventory, purchase orders, voice commands'}
              {user.role === 'Sales Personnel' && ' · POS sales & inventory view'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {allowedItems.map(item => (
              <ChevronRight key={item.path} size={10} color={rc.color} strokeWidth={2.5} />
            ))}
            <span style={{ fontSize: 11, color: rc.color, opacity: 0.7 }}>{allowedItems.length} modules</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MAIN CONTENT
          ════════════════════════════════════════════ */}
      <main style={{
        maxWidth: 1440, width: '100%', margin: '0 auto',
        padding: '28px 24px 48px',
        minHeight: 'calc(100vh - var(--nav-height) - 33px)',
      }}>
        {children}
      </main>
    </div>
  );
}
