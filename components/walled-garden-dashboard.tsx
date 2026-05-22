"use client";

/**
 * WalledGardenDashboard — Slate360 Command Center page contents.
 * AppShell (sidebar + topbar) is provided by app/(dashboard)/layout.tsx.
 */

import { CommandCenterContent } from "@/components/dashboard/command-center/CommandCenterContent";
import type { Entitlements } from "@/lib/entitlements";

interface WalledGardenDashboardProps {
  entitlements?: Entitlements | null;
  isSlateCeo?: boolean;
}

export default function WalledGardenDashboard({
  entitlements = null,
  isSlateCeo = false,
}: WalledGardenDashboardProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <CommandCenterContent
        entitlements={entitlements}
        isSlateCeo={isSlateCeo}
      />
    </div>
  );
}
