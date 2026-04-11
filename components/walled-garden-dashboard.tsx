"use client";

/**
 * Walled Garden Dashboard — Slate360
 *
 * Thin orchestrator shell. All sub-components live in
 * `components/dashboard/command-center/`.
 */

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/command-center/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/command-center/DashboardTopBar";
import { CommandCenterContent } from "@/components/dashboard/command-center/CommandCenterContent";

interface WalledGardenDashboardProps {
  userName: string;
  orgName: string;
  storageLimitGb?: number;
}

export default function WalledGardenDashboard({
  userName,
  orgName,
  storageLimitGb = 5,
}: WalledGardenDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="dark min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-64 p-0 !bg-zinc-950 !border-zinc-800 lg:hidden"
          >
            <DashboardSidebar isOpen isMobile onClose={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Top Bar */}
        <DashboardTopBar
          isSidebarOpen={sidebarOpen}
          userName={userName}
          onMenuClick={() => {
            if (typeof window !== "undefined" && window.innerWidth >= 1024) {
              setSidebarOpen(!sidebarOpen);
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
            />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
