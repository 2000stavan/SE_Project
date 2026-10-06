import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, UserCheck, Package, ShoppingCart, Lock, AlertCircle } from 'lucide-react';

interface QuickAccount {
  label: string;
  id: string;
  role: string;
  icon: typeof ShieldCheck;
  color: string;
}

const DEMO_ACCOUNTS: QuickAccount[] = [
  { label: 'Alice Admin', id: 'USR-ADMIN-1', role: 'Administrator', icon: ShieldCheck, color: 'text-purple-400 bg-purple-950/40 border-purple-800/50' },
  { label: 'Bob Manager', id: 'USR-MGR-1', role: 'Manager', icon: UserCheck, color: 'text-blue-400 bg-blue-950/40 border-blue-800/50' },
  { label: 'Charlie Warehouse', id: 'USR-WH-1', role: 'Warehouse Staff', icon: Package, color: 'text-amber-400 bg-amber-950/40 border-amber-800/50' },
  { label: 'Dave Sales', id: 'USR-SALES-1', role: 'Sales Personnel', icon: ShoppingCart, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please check credentials.');
      }
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Quick login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-emerald-900/30 mb-4">
          IS
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">ISMS Authentication</h2>
        <p className="mt-2 text-sm text-slate-400">Inventory & Stock Management System — Release 1.0</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Fast Demo Sign-In (4 Roles)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    disabled={isLoading}
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border text-left transition hover:brightness-125 ${acc.color}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white truncate">{acc.label}</div>
                      <div className="text-[10px] opacity-80 truncate">{acc.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or enter credentials</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 flex items-start space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">User ID or Email</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. USR-ADMIN-1 or admin@isms.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-600 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-slate-500">
              Demo passwords default to <code className="text-slate-400">Password123!</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
