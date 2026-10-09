import { ReactElement } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import Layout from './components/Layout';
import InventoryPage from './pages/inventory/InventoryPage';
import VoiceCommandPage from './pages/voice/VoiceCommandPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import PurchaseOrdersPage from './pages/purchaseOrders/PurchaseOrdersPage';
import SalesPage from './pages/sales/SalesPage';
import ForecastPage from './pages/forecast/ForecastPage';
import UsersPage from './pages/admin/UsersPage';
import {
  Boxes, ShoppingCart, ClipboardList, TrendingUp, Users,
  Building2, Mic, Bell, ArrowRight, ShieldCheck,
  PackageCheck, AlertTriangle, BarChart3, Zap,
  Target, Activity,
} from 'lucide-react';

// ── Role-based Route Guard ──────────────────────────────────────────────────

function RoleGuard({ children, allowedRoles }: { children: ReactElement; allowedRoles: string[] }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '50vh', gap: 16, textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-xl)',
          background: 'var(--color-danger-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={24} color="var(--color-danger)" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--color-ink)', marginBottom: 6 }}>Access Restricted</div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
            Your role (<strong>{user?.role}</strong>) does not have permission to view this page.
          </div>
        </div>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', borderRadius: 'var(--radius-pill)',
          background: 'var(--color-primary)', color: '#fff',
          fontSize: 14, fontWeight: 500, textDecoration: 'none',
        }}>← Back to Dashboard</Link>
      </div>
    );
  }
  return children;
}

// ── Shared StatCard ────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, accentColor, link,
}: {
  icon: typeof Boxes; label: string; value: string; sub: string; accentColor: string; link?: string;
}) {
  const content = (
    <div className="stat-card" style={{ cursor: link ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: accentColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={accentColor} strokeWidth={1.8} />
        </div>
        {link && <ArrowRight size={14} color="var(--color-ink-mute)" strokeWidth={1.5} />}
      </div>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 400, color: 'var(--color-ink)', marginBottom: 4, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--color-ink-mute)' }}>{sub}</div>
    </div>
  );
  if (link) return <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link>;
  return content;
}

// ── Quick Action Card ──────────────────────────────────────────────────────

function QuickAction({ icon: Icon, label, sub, path, accent }: {
  icon: typeof Boxes; label: string; sub: string; path: string; accent: string;
}) {
  return (
    <Link to={path} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        background: 'var(--color-canvas)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--radius-lg)',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = accent + '60'; el.style.boxShadow = `0 4px 16px ${accent}20`; el.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-hairline)'; el.style.boxShadow = ''; el.style.transform = ''; }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={accent} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--color-ink-mute)' }}>{sub}</div>
        </div>
        <ArrowRight size={15} color="var(--color-ink-mute)" strokeWidth={1.5} />
      </div>
    </Link>
  );
}

// ── Role-specific dashboards ───────────────────────────────────────────────

function AdminDashboard({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero */}
      <div className="card-primary" style={{ padding: '28px 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>Administrator Dashboard</div>
        <div style={{ fontSize: 28, fontWeight: 300, color: '#fff', letterSpacing: '-0.6px', marginBottom: 8 }}>Welcome back, {name} 👋</div>
        <div style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.75)', maxWidth: 520 }}>
          Full system access. Manage users, configure settings, monitor forecasts, approve purchase orders, and oversee all operations.
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon={ShieldCheck}   label="Session"         value="Active · JWT"    sub="30-min sliding token renewal" accentColor="var(--color-primary)" />
        <StatCard icon={PackageCheck}  label="Role"            value="Administrator"   sub="All modules unlocked"         accentColor="#16a34a" />
        <StatCard icon={Boxes}         label="Database"        value="10 Tables"       sub="Flyway V1+V2 migrations"      accentColor="#d97706" link="/inventory" />
        <StatCard icon={AlertTriangle} label="Security"        value="5 fails / 15m"  sub="Lockout protection active"    accentColor="var(--color-danger)" />
      </div>

      {/* Quick actions */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          <QuickAction icon={Users}         label="Manage Users"         sub="Add, edit, suspend accounts"   path="/users"           accent="var(--color-primary)" />
          <QuickAction icon={TrendingUp}    label="Demand Forecasting"   sub="Run Holt-Winters forecast"     path="/forecast"        accent="#8b5cf6" />
          <QuickAction icon={ClipboardList} label="Purchase Orders"      sub="Review & approve POs"          path="/purchase-orders" accent="#2563eb" />
          <QuickAction icon={BarChart3}     label="Revenue Analytics"    sub="Sales & stock insights"        path="/forecast"        accent="#d97706" />
          <QuickAction icon={Building2}     label="Suppliers"            sub="Manage supplier network"       path="/suppliers"       accent="#059669" />
          <QuickAction icon={Bell}          label="Notifications"         sub="System alerts & events"        path="/notifications"   accent="#dc2626" />
        </div>
      </div>
    </div>
  );
}

function ManagerDashboard({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', boxShadow: 'var(--shadow-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary-bg-subdued)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} color="var(--color-primary)" strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-mute)', marginBottom: 4 }}>Manager Dashboard</div>
            <div style={{ fontSize: 22, fontWeight: 400, color: 'var(--color-ink)', letterSpacing: '-0.4px' }}>Good day, {name}</div>
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 300, color: 'var(--color-ink-mute)', lineHeight: 1.6 }}>
          Review forecasts, approve purchase orders, monitor inventory health, and manage supplier relationships.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon={PackageCheck}  label="Access Level"    value="Manager"         sub="Approval & analytics modules"  accentColor="var(--color-primary)" />
        <StatCard icon={Activity}      label="Forecasting"     value="Holt-Winters"    sub="7-day cycle demand model"      accentColor="#8b5cf6" link="/forecast" />
        <StatCard icon={ClipboardList} label="Purchase Orders" value="PO Management"   sub="Review & create orders"        accentColor="#2563eb" link="/purchase-orders" />
        <StatCard icon={Building2}     label="Suppliers"       value="Supplier Network" sub="Manage & view suppliers"      accentColor="#059669" link="/suppliers" />
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Your Modules</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          <QuickAction icon={TrendingUp}    label="Forecasting & Analytics"  sub="Demand forecast, revenue, stock views"  path="/forecast"        accent="#8b5cf6" />
          <QuickAction icon={ClipboardList} label="Purchase Orders"           sub="Create & approve POs"                   path="/purchase-orders" accent="#2563eb" />
          <QuickAction icon={Building2}     label="Suppliers"                 sub="Manage supplier network"                path="/suppliers"       accent="#059669" />
          <QuickAction icon={Boxes}         label="Inventory"                 sub="Monitor stock levels"                   path="/inventory"       accent="var(--color-primary)" />
          <QuickAction icon={Mic}           label="Voice Commands"            sub="Adjust stock by voice"                  path="/voice"           accent="#dc2626" />
          <QuickAction icon={Bell}          label="Notifications"             sub="Alerts & low-stock warnings"            path="/notifications"   accent="#d97706" />
        </div>
      </div>
    </div>
  );
}

function WarehouseDashboard({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef9c3 100%)', border: '1px solid #fde68a', borderRadius: 'var(--radius-xl)', padding: '28px 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#92400e', marginBottom: 8 }}>Warehouse Staff Portal</div>
        <div style={{ fontSize: 24, fontWeight: 400, color: '#78350f', letterSpacing: '-0.4px', marginBottom: 8 }}>Hello, {name}</div>
        <div style={{ fontSize: 14, fontWeight: 300, color: '#92400e', lineHeight: 1.6 }}>
          Manage inventory levels, process purchase order receipts, and update stock using voice commands.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon={Boxes}         label="Inventory"      value="Stock Management"  sub="View & adjust stock levels"   accentColor="#d97706" link="/inventory" />
        <StatCard icon={ClipboardList} label="Purchase Orders" value="PO Receiving"    sub="Receive & confirm deliveries" accentColor="#2563eb" link="/purchase-orders" />
        <StatCard icon={Mic}           label="Voice Stock"    value="Voice Commands"    sub="Hands-free stock updates"    accentColor="#dc2626" link="/voice" />
        <StatCard icon={Bell}          label="Alerts"         value="Low-Stock Alerts"  sub="Real-time WebSocket feed"    accentColor="#d97706" link="/notifications" />
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Your Tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          <QuickAction icon={Boxes}         label="Inventory Management"  sub="View products, locations, stock qty"   path="/inventory"       accent="#d97706" />
          <QuickAction icon={ClipboardList} label="Purchase Orders"       sub="Receive goods, update PO status"       path="/purchase-orders" accent="#2563eb" />
          <QuickAction icon={Mic}           label="Voice Commands"        sub="Update stock levels hands-free"        path="/voice"           accent="#dc2626" />
          <QuickAction icon={Bell}          label="Stock Alerts"          sub="Real-time low-stock notifications"     path="/notifications"   accent="#92400e" />
        </div>
      </div>
    </div>
  );
}

function SalesPersonnelDashboard({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-xl)', padding: '28px 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#166534', marginBottom: 8 }}>Sales Personnel Portal</div>
        <div style={{ fontSize: 24, fontWeight: 400, color: '#14532d', letterSpacing: '-0.4px', marginBottom: 8 }}>Ready to sell, {name}?</div>
        <div style={{ fontSize: 14, fontWeight: 300, color: '#166534', lineHeight: 1.6 }}>
          Process sales at the POS terminal, handle marketplace orders, and check current inventory levels.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon={ShoppingCart} label="POS Terminal"  value="Sales & POS"       sub="Process walk-in & online orders" accentColor="#16a34a" link="/sales" />
        <StatCard icon={Boxes}        label="Stock View"    value="Inventory"          sub="Check product availability"      accentColor="var(--color-primary)" link="/inventory" />
        <StatCard icon={Zap}          label="Channels"      value="Multi-channel"      sub="Amazon, Flipkart, Shopify webhooks" accentColor="#d97706" link="/sales" />
        <StatCard icon={Bell}         label="Notifications" value="Order Alerts"        sub="Sales & system notifications"   accentColor="#dc2626" link="/notifications" />
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Your Workspace</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          <QuickAction icon={ShoppingCart} label="Sales & POS Terminal"    sub="Create sale, search products, checkout" path="/sales"         accent="#16a34a" />
          <QuickAction icon={Boxes}        label="Inventory Viewer"         sub="Check stock levels by location"         path="/inventory"     accent="var(--color-primary)" />
          <QuickAction icon={Bell}         label="Notifications"             sub="Order confirmations & alerts"           path="/notifications" accent="#d97706" />
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

function DashboardOverview() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'Administrator':    return <AdminDashboard name={user.name} />;
    case 'Manager':          return <ManagerDashboard name={user.name} />;
    case 'Warehouse Staff':  return <WarehouseDashboard name={user.name} />;
    case 'Sales Personnel':  return <SalesPersonnelDashboard name={user.name} />;
    default:                 return <AdminDashboard name={user.name} />;
  }
}

// ── Protected Route ────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-canvas-soft)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #533afd, #665efd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>IS</div>
        <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>Loading session…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />

        {/* All roles */}
        <Route path="/inventory"     element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff','Sales Personnel']}><InventoryPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff','Sales Personnel']}><NotificationsPage /></RoleGuard></ProtectedRoute>} />

        {/* Warehouse & above */}
        <Route path="/voice"           element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff']}><VoiceCommandPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff']}><PurchaseOrdersPage /></RoleGuard></ProtectedRoute>} />

        {/* Sales & above */}
        <Route path="/sales" element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Sales Personnel']}><SalesPage /></RoleGuard></ProtectedRoute>} />

        {/* Manager & above */}
        <Route path="/forecast"  element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager']}><ForecastPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager']}><SuppliersPage /></RoleGuard></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/users" element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator']}><UsersPage /></RoleGuard></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
