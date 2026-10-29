import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  FileVideo, 
  BellRing, 
  BarChart3, 
  Settings, 
  UserCheck, 
  LogOut, 
  Radio, 
  X,
  AlertTriangle
} from 'lucide-react';
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
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sources', label: 'Sources & Upload', icon: FileVideo },
    { to: '/alerts', label: 'Alert Queue', icon: BellRing },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
    { to: '/admin', label: 'Admin & Audit', icon: UserCheck, adminOnly: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-campus-darkest text-campus-text">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3 bg-red-950/90 border border-red-500/50 rounded-lg shadow-xl shadow-red-950/40 text-sm backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-campus-gold flex-shrink-0" />
              <span className="font-medium text-white">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-campus-dark border-r border-campus-border">
        {/* Brand */}
        <div className="p-5 flex items-center gap-3 border-b border-campus-border">
          <div className="w-10 h-10 rounded-lg bg-campus-card border border-campus-gold/30 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-campus-gold" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-campus-gold tracking-tight">Eagle Eye</h1>
            <p className="text-xs text-campus-textMuted">Campus Surveillance AI</p>
          </div>
        </div>

        {/* Live System Status Pill */}
        <div className="px-5 py-3 border-b border-campus-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-500'}`} />
            <span className="text-campus-textMuted">Live Event Stream:</span>
          </div>
          <span className={`font-semibold ${wsConnected ? 'text-emerald-400' : 'text-amber-500'}`}>
            {wsConnected ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-campus-gold text-campus-darkest font-semibold shadow-md shadow-campus-gold/10'
                      : 'text-campus-textMuted hover:bg-campus-card hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-campus-border bg-campus-darkest/40 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-sm font-semibold truncate text-white">{user?.name || 'Operator'}</p>
            <span className="inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold uppercase rounded bg-campus-gold/10 text-campus-gold border border-campus-gold/20">
              {user?.role || 'Viewer'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-md hover:bg-campus-card text-campus-textMuted hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-campus-darkest">
        <header className="h-14 border-b border-campus-border bg-campus-dark/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-campus-textMuted">
            <span>Eagle Eye v2.0</span>
            <span>•</span>
            <span className="text-campus-gold font-medium">Ctrl+Shift+Go Security Suite</span>
          </div>
          <div className="text-xs bg-campus-card px-3 py-1 rounded-full border border-campus-border text-campus-textMuted">
            Campus Node: <span className="text-white font-medium">Hostel & Perimeter Hub</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
