import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useAlertStore } from '../stores/alertStore';

export const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { wsConnected, initWebSocket, toasts, removeToast } = useAlertStore();
  const navigate = useNavigate();

  useEffect(() => {
    initWebSocket();
  }, [initWebSocket]);

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/sources', label: 'Sources & Upload' },
    { to: '/alerts', label: 'Alert Queue' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/settings', label: 'Settings', adminOnly: true },
    { to: '/admin', label: 'Admin & Audit', adminOnly: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-black text-brand-white">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3 bg-brand-darkest border-2 border-brand-red rounded-lg shadow-2xl text-sm backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-brand-yellow flex-shrink-0" />
              <span className="font-bold text-brand-white">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-brand-textMuted hover:text-brand-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar - Plain Text Labels */}
      <aside className="w-64 flex flex-col bg-brand-dark border-r border-brand-border">
        {/* Brand */}
        <div className="p-5 border-b border-brand-border">
          <h1 className="font-extrabold text-lg text-brand-white tracking-tight">Eagle Eye</h1>
          <p className="text-xs text-amber-600 font-semibold tracking-wide">SURVEILLANCE AI</p>
        </div>

        {/* Live System Status Pill */}
        <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between text-xs">
          <span className="text-brand-textMuted">Live Event Stream:</span>
          <span className={`font-mono font-bold ${wsConnected ? 'text-amber-600' : 'text-brand-red'}`}>
            {wsConnected ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Navigation Links - Plain Text Labels (No Icons) */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-yellow text-brand-black shadow-sm font-bold'
                      : 'text-brand-textMuted hover:bg-brand-card hover:text-brand-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-brand-border bg-brand-black flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-sm font-bold truncate text-brand-white">{user?.name || 'Operator'}</p>
            <span className="inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-900 border border-amber-300">
              {user?.role || 'Viewer'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="px-2.5 py-1.5 rounded-md hover:bg-brand-card text-brand-textMuted hover:text-brand-red text-xs font-semibold transition"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-black">
        <header className="h-14 border-b border-brand-border bg-brand-dark px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-brand-textMuted">
            <span className="font-semibold text-brand-white">Eagle Eye 2.0</span>
            <span>•</span>
            <span className="text-brand-yellow font-bold">CCTV Threat Intelligence</span>
          </div>
          <div className="text-xs bg-brand-card px-3 py-1 rounded border border-brand-border text-brand-textMuted">
            Security Node: <span className="text-brand-white font-bold">Perimeter & Corridor Hub</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-brand-black">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
