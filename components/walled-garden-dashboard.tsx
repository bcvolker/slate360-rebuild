"use client";

/**
 * Walled Garden Dashboard — Slate360
 *
 * Thin orchestrator shell. All sub-components live in
 * `components/dashboard/command-center/`.
 */

import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/command-center/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/command-center/DashboardTopBar";
import { CommandCenterContent } from "@/components/dashboard/command-center/CommandCenterContent";
import type { Entitlements } from "@/lib/entitlements";

interface WalledGardenDashboardProps {
  userName: string;
  orgName: string;
  storageLimitGb?: number;
  entitlements?: Entitlements | null;
  hasOperationsConsoleAccess?: boolean;
}

const SIDEBAR_PIN_KEY = "slate360.sidebar.pinned";

export default function WalledGardenDashboard({
  userName,
  orgName,
  storageLimitGb = 5,
  entitlements = null,
  hasOperationsConsoleAccess = false,
}: WalledGardenDashboardProps) {
  // Default OPEN on desktop. Only collapse if user explicitly pinned closed.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Restore explicit collapsed state on mount (desktop only).
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
      /* ignore localStorage failures (private mode, etc.) */
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
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} hasOperationsConsoleAccess={hasOperationsConsoleAccess} />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-64 p-0 !bg-zinc-950 !border-zinc-800 lg:hidden"
          >
            <DashboardSidebar isOpen isMobile onClose={() => setMobileSidebarOpen(false)} hasOperationsConsoleAccess={hasOperationsConsoleAccess} />
          </SheetContent>
        </Sheet>

        {/* Top Bar */}
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

        {/* Main Content */}
        <main
          className={cn(
            "pt-16 transition-all duration-300",
            sidebarOpen ? "lg:pl-64" : "lg:pl-0"
          )}
        >
          <div className="p-4 lg:p-6">
            <CommandCenterContent
              userName={userName}
              orgName={orgName}
              storageLimitGb={storageLimitGb}
              entitlements={entitlements}
            />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
