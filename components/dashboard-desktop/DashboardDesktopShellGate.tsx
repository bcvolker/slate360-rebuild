"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { shouldWrapDashboardDesktopShell } from "@/lib/dashboard/dashboard-shell-paths";
import type { InviteShareData } from "@/lib/types/invite";
import { DashboardDesktopShell } from "./DashboardDesktopShell";

type DashboardDesktopShellGateProps = {
  userName: string;
  workspaceName: string;
  inviteShareData: InviteShareData;
  showOpsConsole?: boolean;
  isCeo?: boolean;
  visibleApps?: import("@/lib/spatial-walkthrough/client-surface").ClientSurfaceApp[] | null;
  children: ReactNode;
};

/** Applies desktop sidebar shell only on matching workspace routes. */
export function DashboardDesktopShellGate({
  userName,
  workspaceName,
  inviteShareData,
  showOpsConsole,
  isCeo,
  visibleApps,
  children,
}: DashboardDesktopShellGateProps) {
  const pathname = usePathname() ?? "";

  if (!shouldWrapDashboardDesktopShell(pathname)) {
    return <>{children}</>;
  }

  return (
    <DashboardDesktopShell
      userName={userName}
      workspaceName={workspaceName}
      inviteShareData={inviteShareData}
      showOpsConsole={showOpsConsole}
      isCeo={isCeo}
      visibleApps={visibleApps}
    >
      {children}
    </DashboardDesktopShell>
  );
}
