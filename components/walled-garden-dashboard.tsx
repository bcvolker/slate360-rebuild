"use client";

/**
 * WalledGardenDashboard — Slate360 Command Center page contents.
 * AppShell (sidebar + topbar) is provided by app/(dashboard)/layout.tsx.
 */

import { CommandCenterContent } from "@/components/dashboard/command-center/CommandCenterContent";
import type { Entitlements } from "@/lib/entitlements";

interface WalledGardenDashboardProps {
  entitlements?: Entitlements | null;
  /** True for Slate360 CEO/owner — unlocks Twin app tile. */
  isSlateCeo?: boolean;
}

export default function WalledGardenDashboard({
  entitlements = null,
  isSlateCeo = false,
}: WalledGardenDashboardProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <CommandCenterContent
        entitlements={entitlements}
        isSlateCeo={isSlateCeo}
      />
    </div>
  );
}
