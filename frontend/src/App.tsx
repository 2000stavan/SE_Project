import { ReactElement } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
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
import DashboardPage from './pages/dashboard/DashboardPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import PasswordResetPage from './pages/auth/PasswordResetPage';
import NotificationPreferencesPage from './pages/notifications/NotificationPreferencesPage';
import OnboardingModal from './components/OnboardingModal';

// ── Role-based Route Guard ──────────────────────────────────────────────────

function RoleGuard({ children, allowedRoles }: { children: ReactElement; allowedRoles: string[] }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={24} color="var(--color-danger)" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--color-ink)', marginBottom: 6 }}>Access Restricted</div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-mute)', fontWeight: 300 }}>
            Your role (<strong>{user?.role}</strong>) does not have permission to view this page.
          </div>
        </div>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>← Back to Dashboard</Link>
      </div>
    );
  }
  return children;
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
  return <Layout>{children}<OnboardingModal /></Layout>;
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/"                element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/inventory"       element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff','Sales Personnel']}><InventoryPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/voice"           element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff']}><VoiceCommandPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/suppliers"       element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager']}><SuppliersPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff']}><PurchaseOrdersPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/sales"           element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Sales Personnel']}><SalesPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/forecast"        element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager']}><ForecastPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/users"           element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator']}><UsersPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/notifications"   element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff','Sales Personnel']}><NotificationsPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/notifications/preferences" element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator','Manager','Warehouse Staff','Sales Personnel']}><NotificationPreferencesPage /></RoleGuard></ProtectedRoute>} />
        <Route path="/audit-log"       element={<ProtectedRoute><RoleGuard allowedRoles={['Administrator']}><AuditLogPage /></RoleGuard></ProtectedRoute>} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
