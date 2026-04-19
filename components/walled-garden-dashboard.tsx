"use client";

/**
 * WalledGardenDashboard — Slate360 Command Center page contents.
 * AppShell (sidebar + topbar) is provided by app/(dashboard)/layout.tsx.
 */

import { CommandCenterContent } from "@/components/dashboard/command-center/CommandCenterContent";
import type { Entitlements } from "@/lib/entitlements";

interface WalledGardenDashboardProps {
  userName: string;
  orgName: string;
  storageLimitGb?: number;
  entitlements?: Entitlements | null;
}

export default function WalledGardenDashboard({
  userName,
  orgName,
  storageLimitGb = 5,
  entitlements = null,
}: WalledGardenDashboardProps) {
  return (
    <div className="p-4 lg:p-6">
      <CommandCenterContent
        userName={userName}
        orgName={orgName}
        storageLimitGb={storageLimitGb}
        entitlements={entitlements}
      />
    </div>
  );
}
