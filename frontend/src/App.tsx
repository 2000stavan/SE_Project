import { Routes, Route, Link } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
            IS
          </div>
          <span className="font-semibold text-lg tracking-wide">ISMS</span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">v1.0.0</span>
        </div>
        <nav className="flex items-center space-x-4 text-sm text-slate-400">
          <Link to="/" className="hover:text-emerald-400 transition-colors">Overview</Link>
          <Link to="/login" className="hover:text-emerald-400 transition-colors">Login</Link>
        </nav>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <Routes>
          <Route
            path="/"
            element={
              <div className="max-w-2xl mt-12">
                <h1 className="text-3xl font-bold text-white mb-3">Inventory and Stock Management System</h1>
                <p className="text-slate-400 mb-6">
                  Phase P0 Scaffolding Ready. Multi-role inventory platform with real-time sync, voice commands, PO tracking, and sales processing.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                    <h3 className="font-medium text-emerald-400 mb-1">Backend</h3>
                    <p className="text-xs text-slate-400">Spring Boot 3.3.5 • PostgreSQL 16 • Flyway</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                    <h3 className="font-medium text-emerald-400 mb-1">Frontend</h3>
                    <p className="text-xs text-slate-400">React 18 • Vite • TypeScript • Tailwind</p>
                  </div>
                </div>
              </div>
            }
          />
          <Route
            path="/login"
            element={
              <div className="max-w-md mx-auto mt-16 p-6 rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">Sign in to ISMS</h2>
                <p className="text-xs text-slate-400 mb-6">Authentication module will be activated in Phase P1.</p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
