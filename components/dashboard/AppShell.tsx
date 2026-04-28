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
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/command-center/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/command-center/DashboardTopBar";
import CommandPalette from "@/components/shared/CommandPalette";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import { InviteShareModal } from "@/components/shared/InviteShareModal";
import { MobileTopBar } from "@/components/shared/MobileTopBar";
import { MobileInstallStrip } from "@/components/shared/MobileInstallStrip";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import type { InviteShareData } from "@/lib/types/invite";

interface AppShellProps {
  userName: string;
  workspaceName?: string | null;
  hasOperationsConsoleAccess?: boolean;
  inviteShareData: InviteShareData;
  isBetaEligible?: boolean;
  children: ReactNode;
}

function GlobalInviteModal({ data }: { data: InviteShareData }) {
  const { open, setOpen } = useInviteShare();
  return <InviteShareModal open={open} onOpenChange={setOpen} {...data} />;
}

const SIDEBAR_PIN_KEY = "slate360.sidebar.pinned";

export function AppShell({
  userName,
  workspaceName,
  hasOperationsConsoleAccess = false,
  inviteShareData,
  isBetaEligible = false,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const pathname = usePathname() ?? "";
  // Active Site Walk task modes own the entire viewport — no app chrome.
  const fullBleed =
    pathname.startsWith("/site-walk/capture") ||
    /^\/site-walk\/walks\/active\/[^/]+/.test(pathname);

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

  // Global ⌘K / Ctrl+K listener so the palette works from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
     <InviteShareProvider>
      {fullBleed ? (
        <div className="fixed inset-0 w-full h-[100dvh] bg-background overflow-hidden">
          {children}
          <GlobalInviteModal data={inviteShareData} />
        </div>
      ) : (
      <div className="relative h-[100dvh] w-full max-w-full overflow-hidden bg-slate-50 text-slate-900">
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
            className="w-64 p-0 !bg-background !border-zinc-800 lg:hidden"
          >
            <DashboardSidebar
              isOpen
              isMobile
              onClose={() => setMobileSidebarOpen(false)}
              hasOperationsConsoleAccess={hasOperationsConsoleAccess}
            />
          </SheetContent>
        </Sheet>

        <div className="hidden lg:block">
          <DashboardTopBar
            isSidebarOpen={sidebarOpen}
            userName={userName}
            isBetaEligible={isBetaEligible}
            showLogo={!sidebarOpen}
            onMenuClick={() => {
              if (typeof window !== "undefined" && window.innerWidth >= 1024) {
                toggleSidebar();
              } else {
                setMobileSidebarOpen(true);
              }
            }}
          />
        </div>

        <MobileTopBar
          userName={userName}
          workspaceName={workspaceName ?? "Slate360"}
          isBetaEligible={isBetaEligible}
          onSearchClick={() => setPaletteOpen(true)}
        />

        <main
          className={cn(
            "flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden pt-14 pb-[76px] transition-all duration-300",
            "lg:pt-16 lg:pb-0",
            sidebarOpen ? "lg:pl-64" : "lg:pl-0"
          )}
        >
          <MobileInstallStrip />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </main>

        <MobileBottomNav />

        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          hasOperationsConsoleAccess={hasOperationsConsoleAccess}
        />
        <GlobalInviteModal data={inviteShareData} />
      </div>
      )}
     </InviteShareProvider>
    </TooltipProvider>
  );
}
