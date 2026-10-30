import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  PanelLeftClose, 
  PanelLeftOpen,
  LayoutDashboard, 
  Video, 
  Bell, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  LogOut,
  X 
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useAlertStore } from '../stores/alertStore';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { wsConnected, initWebSocket, toasts, removeToast } = useAlertStore();
  const navigate = useNavigate();

  useEffect(() => {
    initWebSocket();
  }, [initWebSocket]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sources', label: 'Sources & upload', icon: Video },
    { to: '/alerts', label: 'Alert queue', icon: Bell },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
    { to: '/admin', label: 'Admin & audit', icon: ShieldCheck, adminOnly: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-black text-brand-white font-sans">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-4 p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-sm font-semibold"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-red"></span>
              <span className="text-brand-white text-xs">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-brand-textMuted hover:text-brand-white transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar - Collapsible with Lucide icons on collapse */}
      <aside 
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } flex flex-col bg-brand-card shadow-[0_0_0_1px_#e6e3dc] transition-all duration-200 z-20 flex-shrink-0`}
      >
        {/* Brand */}
        <div className="h-14 px-4 border-b border-brand-border flex items-center justify-between">
          {!collapsed ? (
            <div>
              <h1 className="font-semibold text-xl text-brand-white tracking-tight">Eagle Eye</h1>
              <p className="text-xs text-brand-accent font-semibold">Surveillance AI</p>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <span className="font-semibold text-xl text-brand-accent">EE</span>
            </div>
          )}
        </div>

        {/* Live System Status Pill */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between text-xs">
            <span className="text-brand-textMuted font-semibold">Live event stream:</span>
            <span className={`font-semibold ${wsConnected ? 'text-brand-accent' : 'text-brand-red'}`}>
              {wsConnected ? 'Active' : 'Offline'}
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-[12px] transition-all ${
                    collapsed ? 'justify-center p-3' : 'px-4 py-2.5 text-sm font-semibold'
                  } ${
                    isActive
                      ? 'bg-brand-accent text-white shadow-sm'
                      : 'text-brand-textMuted hover:bg-brand-cardHover hover:text-brand-white'
                  }`
                }
              >
                {collapsed ? (
                  <Icon className="w-5 h-5" />
                ) : (
                  <span>{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-brand-border bg-brand-card">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="truncate pr-1">
                <p className="text-xs font-semibold truncate text-brand-white">{user?.name || 'Operator'}</p>
                <span className="text-xs text-brand-textMuted capitalize">
                  {user?.role || 'Viewer'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="px-2.5 py-1.5 rounded-[12px] hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-red text-xs font-semibold transition"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Log out"
              className="w-full flex items-center justify-center p-2 rounded-[12px] hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-red transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-black">
        {/* Navbar Header with Sidebar Close/Collapse Button */}
        <header className="h-14 shadow-[0_0_0_1px_#e6e3dc] bg-brand-card px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand sidebar' : 'Close sidebar'}
              className="p-2 rounded-[12px] text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover transition"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-brand-textMuted font-semibold">
              <span className="text-brand-white">Eagle Eye 2.0</span>
              <span>•</span>
              <span className="text-brand-accent">CCTV threat intelligence</span>
            </div>
          </div>

          <div className="text-xs px-3 py-1.5 rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] bg-brand-card text-brand-textMuted font-semibold">
            Security node: <span className="text-brand-white">Perimeter & corridor hub</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-brand-black">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
