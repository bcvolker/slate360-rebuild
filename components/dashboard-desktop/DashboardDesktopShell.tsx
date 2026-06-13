"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
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

function ShellInner({ userName, workspaceName, inviteShareData, showOpsConsole, isCeo, children }: DashboardDesktopShellProps) {
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  return (
    <div className={`flex min-h-[100dvh] ${t.canvas}`}>
      <DashboardDesktopSidebar showOpsConsole={showOpsConsole} isCeo={isCeo} />
      <div className={t.main}>
        <DashboardDesktopTopBar workspaceName={workspaceName} userName={userName} />
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
