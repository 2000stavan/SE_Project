import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import Layout from './components/Layout';
import InventoryPage from './pages/inventory/InventoryPage';
import VoiceCommandPage from './pages/voice/VoiceCommandPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import PurchaseOrdersPage from './pages/purchaseOrders/PurchaseOrdersPage';
import { Boxes, PackageCheck, AlertTriangle, ShieldCheck } from 'lucide-react';

function DashboardOverview() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <span className="font-semibold text-emerald-400">{user.role}</span> ({user.userId})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Session Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">Active (30m Sliding)</div>
          <p className="text-[10px] text-slate-500 mt-1">Automatic sliding renewal enabled</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Assigned Role</span>
            <PackageCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">{user.role}</div>
          <p className="text-[10px] text-slate-500 mt-1">Role-based access enforced (F1.4)</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Database Schema</span>
            <Boxes className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">Validated (V1 + V2)</div>
          <p className="text-[10px] text-slate-500 mt-1">10 tables mapped via schema.md</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Security Guard</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">5 Fails / 15m Lock</div>
          <p className="text-[10px] text-slate-500 mt-1">Lockout protection active</p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voice"
          element={
            <ProtectedRoute>
              <VoiceCommandPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
