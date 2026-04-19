"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Layers } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function ContentStudioShell({ user, tier, isCeo, internalAccess }: Props) {
  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      isCeo={isCeo}
      internalAccess={internalAccess}
      title="Content Studio"
      icon={Layers}
      accent="#EC4899"
      status="coming-soon"
      requiredTier="standard"
    >
      <div className="rounded-2xl border border-app bg-app-card px-6 py-10 text-center">
        <p className="text-sm font-semibold text-white mb-1">Coming Soon</p>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Content Studio — renderings, walkthrough videos, AI-assisted editing, and
          asset management — is planned for a future development phase.
          You&apos;ll be notified when it launches.
        </p>
      </div>
    </DashboardTabShell>
  );
}
