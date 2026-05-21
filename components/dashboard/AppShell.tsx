"use client";

/**
 * AppShell — shared sidebar + topbar wrapper for authenticated app surfaces.
 *
 * Desktop keeps DashboardSidebar/DashboardTopBar. Mobile uses the shared
 * mobile-system shell primitives so /app and module shells share geometry.
 */

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Cloud, FolderOpen, Home, MessageSquare, User } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/command-center/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/command-center/DashboardTopBar";
import { PlatformMobileTopBar } from "@/components/dashboard/PlatformMobileTopBar";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import {
  MobileAppShell,
  MobileBottomNav,
  type MobileBottomNavItem,
  MobileComingSoonSheet,
} from "@/components/mobile-system";
import type { InviteShareData } from "@/lib/types/invite";

interface AppShellProps {
  userName: string;
  workspaceName?: string | null;
  hasOperationsConsoleAccess?: boolean;
  inviteShareData: InviteShareData;
  isBetaEligible?: boolean;
  children: ReactNode;
}

type PlatformNavKey = "home" | "projects" | "slatedrop" | "coordination" | "account";

const SIDEBAR_PIN_KEY = "slate360.sidebar.pinned";

const CommandPalette = dynamic(() => import("@/components/shared/CommandPalette"), {
  ssr: false,
  loading: () => null,
});

const InviteShareModal = dynamic(
  () => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal),
  { ssr: false, loading: () => null },
);

function activePlatformNavKey(pathname: string): PlatformNavKey {
  if (pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/app")) return "home";
  if (pathname.startsWith("/projects") || pathname.startsWith("/project-hub")) return "projects";
  if (pathname.startsWith("/slatedrop")) return "slatedrop";
  if (pathname.startsWith("/coordination")) return "coordination";
  return "account";
}

function GlobalInviteModal({ data }: { data: InviteShareData }) {
  const { open, setOpen } = useInviteShare();
  if (!open) return null;
  return <InviteShareModal open={open} onOpenChange={setOpen} {...data} />;
}

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
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);

  const pathname = usePathname() ?? "";
  const usesContainedHomeLayout = pathname.startsWith("/app");
  const fullBleed =
    pathname === "/site-walk" ||
    pathname.startsWith("/site-walk/capture") ||
    /^\/site-walk\/walks\/active\/[^/]+/.test(pathname);

  const navItems: MobileBottomNavItem<PlatformNavKey>[] = [
    { key: "home", label: "Home", href: "/app", icon: Home },
    { key: "projects", label: "Projects", onSelect: () => setComingSoonTitle("Projects"), icon: FolderOpen },
    {
      key: "slatedrop",
      label: "SlateDrop",
      icon: Cloud,
      onSelect: () => setComingSoonTitle("SlateDrop"),
    },
    {
      key: "coordination",
      label: "Coordination",
      icon: MessageSquare,
      onSelect: () => setComingSoonTitle("Coordination"),
    },
    { key: "account", label: "Account", href: "/more", icon: User },
  ];

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
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
          <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#0B0F15] text-slate-50 dark">
            {children}
            <GlobalInviteModal data={inviteShareData} />
          </div>
        ) : (
          <>
            <MobileAppShell
              className="relative"
              mobileRoute={usesContainedHomeLayout ? "app" : undefined}
              sidebar={
                <>
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
                </>
              }
              header={
                <>
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
                  <PlatformMobileTopBar
                    userName={userName}
                    workspaceName={workspaceName ?? "Slate360"}
                    isBetaEligible={isBetaEligible}
                    onSearchClick={() => setPaletteOpen(true)}
                  />
                </>
              }
              mainClassName={cn(
                "transition-all duration-300 lg:pt-16",
                sidebarOpen ? "lg:pl-64" : "lg:pl-0",
              )}
              bottomNav={
                <MobileBottomNav
                  items={navItems}
                  activeKey={activePlatformNavKey(pathname)}
                />
              }
            >
              <div
                className={cn(
                  "min-h-0 flex-1 overscroll-contain scrollbar-none",
                  usesContainedHomeLayout
                    ? "flex flex-col overflow-hidden"
                    : "overflow-y-auto pb-4 lg:pb-0",
                )}
              >
                {children}
              </div>
            </MobileAppShell>

            {paletteOpen && (
              <CommandPalette
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
                hasOperationsConsoleAccess={hasOperationsConsoleAccess}
              />
            )}
            <GlobalInviteModal data={inviteShareData} />
            {comingSoonTitle && (
              <MobileComingSoonSheet
                open={!!comingSoonTitle}
                onOpenChange={(open) => !open && setComingSoonTitle(null)}
                title={`${comingSoonTitle} on Mobile`}
              />
            )}
          </>
        )}
      </InviteShareProvider>
    </TooltipProvider>
  );
}
