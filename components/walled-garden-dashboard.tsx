"use client";

/**
 * WalledGardenDashboard — Slate360 Command Center page contents.
 * StudioAppShell chrome is provided by app/(dashboard)/layout.tsx.
 */

import { StudioCommandCenter } from "@/components/studio-ui/StudioCommandCenter";

interface WalledGardenDashboardProps {
  workspaceName?: string | null;
}

export default function WalledGardenDashboard({ workspaceName = null }: WalledGardenDashboardProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <StudioCommandCenter workspaceName={workspaceName} />
    </div>
  );
}
