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
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/command-center/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/command-center/DashboardTopBar";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
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
  if (!open) return null;
  return <InviteShareModal open={open} onOpenChange={setOpen} {...data} />;
}

const SIDEBAR_PIN_KEY = "slate360.sidebar.pinned";

const CommandPalette = dynamic(() => import("@/components/shared/CommandPalette"), {
  ssr: false,
  loading: () => null,
});

const InviteShareModal = dynamic(() => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal), {
  ssr: false,
  loading: () => null,
});

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
        <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#0B0F15] text-slate-50">
          {children}
          <GlobalInviteModal data={inviteShareData} />
        </div>
      ) : (
      <div className="relative flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-[#0B0F15] text-slate-50">
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
            className="w-64 p-0 !border-white/10 !bg-[#0B0F15] lg:hidden"
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
            "flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_32%),#0B0F15] pt-14 pb-[76px] transition-all duration-300",
            "lg:pt-16 lg:pb-0",
            sidebarOpen ? "lg:pl-64" : "lg:pl-0"
          )}
        >
          <MobileInstallStrip />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24 lg:pb-0 scrollbar-none">{children}</div>
        </main>

        <MobileBottomNav />

        {paletteOpen && (
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            hasOperationsConsoleAccess={hasOperationsConsoleAccess}
          />
        )}
        <GlobalInviteModal data={inviteShareData} />
      </div>
      )}
     </InviteShareProvider>
    </TooltipProvider>
  );
}
