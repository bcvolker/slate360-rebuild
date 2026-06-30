"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { resolveShellApp } from "@/lib/shell/resolve-shell-app";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import type { InviteShareData } from "@/lib/types/invite";
import { DashboardDesktopSidebar } from "./DashboardDesktopSidebar";
import { DashboardDesktopTopBar } from "./DashboardDesktopTopBar";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

const InviteShareModal = dynamic(
  () => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal),
  { ssr: false },
);

type DashboardDesktopShellProps = {
  userName: string;
  workspaceName: string;
  inviteShareData: InviteShareData;
  showOpsConsole?: boolean;
  isCeo?: boolean;
  children: ReactNode;
};

function ShellInner({ userName, inviteShareData, showOpsConsole, isCeo, children }: DashboardDesktopShellProps) {
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();
  const pathname = usePathname() ?? "";
  // Unified-shell accent: data-app flips --app-accent (green platform/Site Walk → blue Twin).
  // usePathname is populated during the client shell's SSR render, so this is correct on first
  // paint — no accent flash. Pixel-identical on green routes (--app-accent defaults to green).
  const shellApp = resolveShellApp(pathname);
  const [collapsed, setCollapsed] = useState(false);

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
    <div data-app={shellApp} className={`flex min-h-[100dvh] ${t.canvas}`}>
      <DashboardDesktopSidebar
        showOpsConsole={showOpsConsole}
        isCeo={isCeo}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={t.main}>
        <DashboardDesktopTopBar userName={userName} />
        <main className={t.content}>{children}</main>
      </div>
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
