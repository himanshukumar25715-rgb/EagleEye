import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import { Separator } from "./ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { useAlertStore } from "../stores/alertStore";
import { AudioAlertToggle } from "./AudioAlertToggle";

export const Layout: React.FC = () => {
  const { initWebSocket, toasts, removeToast } = useAlertStore();
  const location = useLocation();

  useEffect(() => {
    initWebSocket();
  }, [initWebSocket]);

  const getPageTitle = (pathname: string): string => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/sources") || pathname.startsWith("/cameras")) return "CCTV camera matrix";
    if (pathname.startsWith("/upload")) return "Upload footage";
    if (pathname.startsWith("/alerts/") && pathname.length > 8) return "Alert review";
    if (pathname.startsWith("/alerts")) return "Alert queue";
    if (pathname.startsWith("/jobs/")) return "Live video feed";
    if (pathname.startsWith("/analytics")) return "Analytics";
    if (pathname.startsWith("/reports")) return "Surveillance reports";
    if (pathname.startsWith("/college-admin")) return "College Administrator Portal";
    if (pathname.startsWith("/owner")) return "Campus Executive & Owner Portal";
    if (pathname.startsWith("/security-room-1")) return "Security Room 1 Tactical Desk";
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/admin")) return "Admin & audit";
    return "Dashboard";
  };

  const pageTitle = getPageTitle(location.pathname);
  const isCctvWall = location.pathname.startsWith("/sources") || location.pathname.startsWith("/cameras");

  return (
    <SidebarProvider>
      {/* High-Visibility Security Alert Pop-ups */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 bg-neutral-900 border-2 border-red-500 shadow-[0_10px_25px_rgba(239,68,68,0.35)] rounded-[8px] text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-red-400">Tactical Security Alert</div>
                <div className="text-white text-xs font-semibold mt-0.5">{toast.message}</div>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition shrink-0"
              title="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* shadcn Application Shell 1 Sidebar */}
      <AppSidebar />

      {/* Main Content Shell */}
      <SidebarInset>
        {/* Top Header with Trigger, Separator & Breadcrumbs */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-brand-border bg-brand-card px-4 shadow-[0_0_0_1px_#e6e3dc] transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Eagle Eye</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <AudioAlertToggle />
            <div className="text-xs px-3 py-1.5 rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] bg-brand-card text-brand-textMuted font-semibold">
              Security node:{" "}
              <span className="text-brand-white">Perimeter & corridor hub</span>
            </div>
          </div>
        </header>

        {/* Viewport Content: Unscrollable for CCTV 9-Camera Matrix */}
        <div
          className={`flex flex-1 flex-col ${
            isCctvWall
              ? "p-3 h-[calc(100vh-3.5rem)] overflow-hidden"
              : "p-6 overflow-y-auto"
          } bg-brand-black`}
        >
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
