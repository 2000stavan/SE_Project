import { ReactNode } from 'react';
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
  HelpCircle,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: typeof Boxes;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inventory', path: '/inventory', icon: Boxes, roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'] },
  { label: 'Voice Command', path: '/voice', icon: Mic, roles: ['Administrator', 'Manager', 'Warehouse Staff'] },
  { label: 'Suppliers', path: '/suppliers', icon: Building2, roles: ['Administrator', 'Manager'] },
  { label: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList, roles: ['Administrator', 'Manager', 'Warehouse Staff'] },
  { label: 'Sales & POS', path: '/sales', icon: ShoppingCart, roles: ['Administrator', 'Manager', 'Sales Personnel'] },
  { label: 'Forecast & Analytics', path: '/forecast', icon: TrendingUp, roles: ['Administrator', 'Manager'] },
  { label: 'User Admin', path: '/users', icon: Users, roles: ['Administrator'] },
  { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['Administrator', 'Manager', 'Warehouse Staff', 'Sales Personnel'] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return <>{children}</>;
  }

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const roleBadgeColor = {
    Administrator: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
    Manager: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    'Warehouse Staff': 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    'Sales Personnel': 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
  }[user.role];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-sm shadow">
              IS
            </div>
            <span className="font-bold text-base tracking-wide text-white">ISMS</span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center space-x-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200">{user.name}</div>
              <div className="text-[10px] text-slate-500">{user.email}</div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
              {user.role}
            </span>
          </div>

          <a
            href="https://github.com/topics/inventory-management-system"
            target="_blank"
            rel="noreferrer"
            title="Contextual Help (UD-1)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <HelpCircle className="w-4 h-4" />
          </a>

          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>
    </div>
  );
}
