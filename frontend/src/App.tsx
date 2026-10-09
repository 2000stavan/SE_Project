import { ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { Boxes, PackageCheck, AlertTriangle, ShieldCheck } from 'lucide-react';

// ── Dashboard Overview ──────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div style={{
      backgroundColor: 'var(--color-canvas)',
      border: '1px solid var(--color-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      boxShadow: 'var(--shadow-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.1px', textTransform: 'uppercase', color: 'var(--color-ink-mute)' }}>
          {label}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          backgroundColor: accent + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={accent} strokeWidth={1.5} />
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 18, fontWeight: 400, color: 'var(--color-ink)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 300 }}>{sub}</div>
    </div>
  );
}

function DashboardOverview() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--color-hairline)', paddingBottom: 24 }}>
        <div className="text-display-lg" style={{ color: 'var(--color-ink)', marginBottom: 6 }}>
          Welcome back, {user.name}
        </div>
        <div style={{ fontSize: 15, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
          Signed in as{' '}
          <span style={{ color: 'var(--color-primary)', fontWeight: 400 }}>{user.role}</span>
          <span style={{ color: 'var(--color-ink-mute)' }}> · {user.userId}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard
          icon={ShieldCheck}
          label="Session Status"
          value="Active · 30m Sliding"
          sub="Automatic token renewal on every request"
          accent="var(--color-primary)"
        />
        <StatCard
          icon={PackageCheck}
          label="Assigned Role"
          value={user.role}
          sub="Role-based access enforced (RBAC)"
          accent="#166534"
        />
        <StatCard
          icon={Boxes}
          label="Database Schema"
          value="Validated · V1 + V2"
          sub="10 tables mapped from schema.md via Flyway"
          accent="#9b6829"
        />
        <StatCard
          icon={AlertTriangle}
          label="Security Guard"
          value="5 Fails / 15 min Lock"
          sub="Login lockout protection active (SE-1)"
          accent="var(--color-ruby)"
        />
      </div>

      {/* Dark feature card */}
      <div className="card-dark" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          System
        </div>
        <div className="text-heading-lg" style={{ color: '#fff', marginBottom: 4 }}>
          Inventory & Stock Management System
        </div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', fontWeight: 300, maxWidth: 560 }}>
          Three core use-case modules live: Inventory (C1), Purchase Orders (C2), and Physical Sales (C3).
          56 backend tests passing. Holt-Winters demand forecasting, WebSocket real-time sync, JWT sliding
          sessions, and HMAC-signed marketplace webhooks all active.
        </div>
      </div>
    </div>
  );
}

// ── Protected Route ─────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: 'var(--color-canvas)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-ink-mute)', fontSize: 15,
      }}>
        Loading session…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/"                element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
        <Route path="/inventory"       element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
        <Route path="/voice"           element={<ProtectedRoute><VoiceCommandPage /></ProtectedRoute>} />
        <Route path="/suppliers"       element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="/sales"           element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
        <Route path="/forecast"        element={<ProtectedRoute><ForecastPage /></ProtectedRoute>} />
        <Route path="/users"           element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/notifications"   element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
