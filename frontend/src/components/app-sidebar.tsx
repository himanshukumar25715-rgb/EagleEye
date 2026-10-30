import * as React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  Bell,
  BarChart3,
  FileText,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "./ui/sidebar";
import { cn } from "../lib/utils";
import { useAuthStore } from "../stores/authStore";
import { useAlertStore } from "../stores/alertStore";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuthStore();
  const { wsConnected } = useAlertStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navPlatform = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sources", label: "CCTV cameras", icon: Video },
    { to: "/alerts", label: "Alert queue", icon: Bell },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/reports", label: "Reports", icon: FileText },
  ];

  const navAdmin = [
    { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
    { to: "/admin", label: "Admin & audit", icon: ShieldCheck, adminOnly: true },
  ];

  const isExpanded = state === "expanded";

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header: Logo and Brand */}
      <SidebarHeader>
        <div className="flex items-center gap-3 px-1 py-1 overflow-hidden transition-all duration-300 ease-in-out">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-brand-accent text-white font-semibold text-xs transition-transform duration-300">
            EE
          </div>
          <div
            className={cn(
              "flex flex-col truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
              isExpanded
                ? "opacity-100 max-w-[160px]"
                : "opacity-0 max-w-0 pointer-events-none"
            )}
          >
            <span className="text-sm font-semibold text-brand-white leading-tight">
              Eagle Eye
            </span>
            <span className="text-[11px] text-brand-accent font-semibold">
              Surveillance AI
            </span>
          </div>
        </div>

        {/* Live Stream Status */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
            isExpanded
              ? "opacity-100 max-h-12 mt-1 border-t border-brand-border/60 pt-1"
              : "opacity-0 max-h-0 mt-0 pt-0 border-t-0 pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-brand-textMuted">
            <span>Live stream:</span>
            <span
              className={`flex items-center gap-1.5 ${
                wsConnected ? "text-brand-accent" : "text-brand-red"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  wsConnected ? "bg-brand-accent animate-pulse" : "bg-brand-red"
                }`}
              />
              {wsConnected ? "Active" : "Offline"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Content: Grouped Navigation */}
      <SidebarContent>
        {/* Main Platform Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navPlatform.map((item) => {
                const isActive =
                  item.to === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.to);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} className="block w-full">
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0 transition-transform duration-300" />
                        <span
                          className={cn(
                            "truncate transition-all duration-300 ease-in-out whitespace-nowrap",
                            isExpanded
                              ? "opacity-100 max-w-[180px]"
                              : "opacity-0 max-w-0 pointer-events-none"
                          )}
                        >
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navAdmin.map((item) => {
                if (item.adminOnly && user?.role !== "admin") return null;
                const isActive = location.pathname.startsWith(item.to);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} className="block w-full">
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0 transition-transform duration-300" />
                        <span
                          className={cn(
                            "truncate transition-all duration-300 ease-in-out whitespace-nowrap",
                            isExpanded
                              ? "opacity-100 max-w-[180px]"
                              : "opacity-0 max-w-0 pointer-events-none"
                          )}
                        >
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User Profile & Log Out */}
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 p-1 overflow-hidden transition-all duration-300 ease-in-out">
          <div
            className={cn(
              "truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
              isExpanded
                ? "opacity-100 max-w-[140px]"
                : "opacity-0 max-w-0 pointer-events-none"
            )}
          >
            <p className="text-xs font-semibold truncate text-brand-white">
              {user?.name || "Operator"}
            </p>
            <p className="text-[11px] text-brand-textMuted capitalize font-semibold truncate">
              {user?.role || "Viewer"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className={cn(
              "p-2 rounded-[12px] hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-red text-xs font-semibold transition shrink-0",
              !isExpanded && "mx-auto"
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
