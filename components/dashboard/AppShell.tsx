"use client";

/**
 * AppShell — shared sidebar + topbar wrapper for all authenticated app surfaces.
 *
 * Use this in every top-level authenticated route layout so the sidebar
 * stays consistent: dashboard, site-walk, tours, projects list, slatedrop, etc.
 *
 * Project-detail sub-layouts (which use DashboardHeader instead) are intentionally
 * NOT wrapped — they have their own scoped chrome.
 */

import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/command-center/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/command-center/DashboardTopBar";

interface AppShellProps {
  userName: string;
  hasOperationsConsoleAccess?: boolean;
  children: ReactNode;
}

const SIDEBAR_PIN_KEY = "slate360.sidebar.pinned";

export function AppShell({
  userName,
  hasOperationsConsoleAccess = false,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
      return;
    }
    try {
      const pinned = window.localStorage.getItem(SIDEBAR_PIN_KEY);
      if (pinned === "0") setSidebarOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_PIN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <TooltipProvider>
      <div className="dark min-h-screen bg-background overflow-x-hidden">
        <div className="hidden lg:block">
          <DashboardSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            hasOperationsConsoleAccess={hasOperationsConsoleAccess}
          />
        </div>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-64 p-0 !bg-zinc-950 !border-zinc-800 lg:hidden"
          >
            <DashboardSidebar
              isOpen
              isMobile
              onClose={() => setMobileSidebarOpen(false)}
              hasOperationsConsoleAccess={hasOperationsConsoleAccess}
            />
          </SheetContent>
        </Sheet>

        <DashboardTopBar
          isSidebarOpen={sidebarOpen}
          userName={userName}
          onMenuClick={() => {
            if (typeof window !== "undefined" && window.innerWidth >= 1024) {
              toggleSidebar();
            } else {
              setMobileSidebarOpen(true);
            }
          }}
        />

        <main
          className={cn(
            "pt-16 transition-all duration-300",
            sidebarOpen ? "lg:pl-64" : "lg:pl-0"
          )}
        >
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
