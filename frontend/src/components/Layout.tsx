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
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/admin")) return "Admin & audit";
    return "Dashboard";
  };

  const pageTitle = getPageTitle(location.pathname);
  const isCctvWall = location.pathname.startsWith("/sources") || location.pathname.startsWith("/cameras");

  return (
    <SidebarProvider>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-4 p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
              <span className="text-brand-white">{toast.message}</span>
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
