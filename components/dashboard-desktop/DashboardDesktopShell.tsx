"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { resolveShellApp } from "@/lib/shell/resolve-shell-app";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import type { InviteShareData } from "@/lib/types/invite";
import { DashboardDesktopSidebar } from "./DashboardDesktopSidebar";
import { DashboardDesktopTopBar } from "./DashboardDesktopTopBar";
import { resolveDashboardNav } from "./dashboard-nav-config";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";
import { isSpatialOnlyAppList } from "@/lib/spatial-walkthrough/nav-filter";
import { MobileBottomNav } from "@/components/mobile-system/MobileBottomNav";
import { resolveMainMobileTabKey, spatialOnlyMobileTabs } from "@/components/mobile-system/mainMobileTabs";

const InviteShareModal = dynamic(
  () => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal),
  { ssr: false },
);

const CommandPalette = dynamic(() => import("@/components/shared/CommandPalette"), { ssr: false });

type DashboardDesktopShellProps = {
  userName: string;
  workspaceName: string;
  inviteShareData: InviteShareData;
  showOpsConsole?: boolean;
  isCeo?: boolean;
  visibleApps?: import("@/lib/spatial-walkthrough/client-surface").ClientSurfaceApp[] | null;
  children: ReactNode;
};

function ShellInner({ userName, inviteShareData, showOpsConsole, isCeo, visibleApps, children }: DashboardDesktopShellProps) {
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();
  const pathname = usePathname() ?? "";
  // Unified-shell accent: data-app flips --app-accent (green platform/Site Walk → blue Twin).
  // usePathname is populated during the client shell's SSR render, so this is correct on first
  // paint — no accent flash. Pixel-identical on green routes (--app-accent defaults to green).
  const shellApp = resolveShellApp(pathname);
  // Single gating source: Twin switcher visibility falls out of resolveDashboardNav
  // (APP_STORE_MODE + CEO/staff) — no separate flag.
  const twinVisible = resolveDashboardNav(Boolean(showOpsConsole), Boolean(isCeo), visibleApps).some(
    (item) => item.href === "/digital-twins",
  );
  const siteWalkVisible = resolveDashboardNav(Boolean(showOpsConsole), Boolean(isCeo), visibleApps).some(
    (item) => item.href === "/site-walks",
  );
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const spatialOnly = isSpatialOnlyAppList(visibleApps, Boolean(isCeo));
  const viewerRoute = pathname.includes("/spatial-walkthrough/") && pathname.split("/").filter(Boolean).length >= 2;

  useEffect(() => {
    setCollapsed(localStorage.getItem("s360.sidebarCollapsed") === "1");
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("s360.sidebarCollapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div data-app={shellApp} className={`flex min-h-[100dvh] overflow-x-hidden ${t.canvas}`}>
      <DashboardDesktopSidebar
        showOpsConsole={showOpsConsole}
        isCeo={isCeo}
        visibleApps={visibleApps}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={t.main}>
        {spatialOnly ? (
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4 lg:hidden" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Spatial Walkthrough</span>
            <span className="truncate text-sm text-[var(--graphite-text-header)]">{userName}</span>
          </header>
        ) : null}
        <DashboardDesktopTopBar
          userName={userName}
          shellApp={shellApp}
          twinVisible={twinVisible}
          siteWalkVisible={siteWalkVisible}
          spatialWalkthroughVisible={
            Boolean(visibleApps?.includes("spatial-walkthrough")) || Boolean(isCeo)
          }
          spatialOnly={spatialOnly}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <main className={`${t.content} ${spatialOnly ? "max-lg:p-0" : ""}`}>{children}</main>
        {spatialOnly && !viewerRoute ? (
          <div className="lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <MobileBottomNav items={spatialOnlyMobileTabs} activeKey={resolveMainMobileTabKey(pathname)} />
          </div>
        ) : null}
      </div>
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        hasOperationsConsoleAccess={Boolean(showOpsConsole)}
        visibleApps={visibleApps}
        spatialOnly={spatialOnly}
      />
      {inviteOpen ? (
        <InviteShareModal open={inviteOpen} onOpenChange={setInviteOpen} {...inviteShareData} />
      ) : null}
    </div>
  );
}

export function DashboardDesktopShell(props: DashboardDesktopShellProps) {
  return (
    <InviteShareProvider inviteShareData={props.inviteShareData}>
      <ShellInner {...props} />
    </InviteShareProvider>
  );
}
