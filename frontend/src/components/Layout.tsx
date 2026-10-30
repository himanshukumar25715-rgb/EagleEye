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
import { AudioAlertToggle } from './AudioAlertToggle';

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

      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-brand-dark border-r border-brand-border">
        {/* Brand */}
        <div className="p-5 flex items-center gap-3 border-b border-brand-border">
          <div className="w-10 h-10 rounded-lg bg-brand-black border border-brand-yellow flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-brand-yellow" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-brand-white tracking-tight">Eagle Eye</h1>
            <p className="text-xs text-brand-yellow font-semibold tracking-wide">SURVEILLANCE AI</p>
          </div>
        </div>

        {/* Live System Status Pill */}
        <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-brand-yellow animate-pulse' : 'text-brand-red'}`} />
            <span className="text-brand-textMuted">Live Event Stream:</span>
          </div>
          <span className={`font-mono font-bold ${wsConnected ? 'text-brand-yellow' : 'text-brand-red'}`}>
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-yellow text-brand-black shadow-md'
                      : 'text-brand-textMuted hover:bg-brand-card hover:text-brand-white'
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
        <div className="p-4 border-t border-brand-border bg-brand-black flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-sm font-bold truncate text-brand-white">{user?.name || 'Operator'}</p>
            <span className="inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold uppercase rounded bg-brand-card text-brand-yellow border border-brand-borderLight">
              {user?.role || 'Viewer'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-md hover:bg-brand-card text-brand-textMuted hover:text-brand-red transition"
          >
            <LogOut className="w-4 h-4" />
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
          <div className="flex items-center gap-3">
            <AudioAlertToggle />
            <div className="text-xs bg-brand-card px-3 py-1 rounded border border-brand-border text-brand-textMuted">
              Security Node: <span className="text-brand-white font-bold">Perimeter & Corridor Hub</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-brand-black">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
