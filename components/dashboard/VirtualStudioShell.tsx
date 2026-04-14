"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Film } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function VirtualStudioShell({ user, tier, isCeo, internalAccess }: Props) {
  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      isCeo={isCeo}
      internalAccess={internalAccess}
      title="Virtual Studio"
      icon={Film}
      accent="#D97706"
      status="coming-soon"
      requiredTier="standard"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-white mb-1">Coming Soon</p>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Virtual Studio — virtual production environments, VR walkthroughs, scene
          composition, and cinematic rendering — is planned for a future development phase.
          You&apos;ll be notified when it launches.
        </p>
      </div>
    </DashboardTabShell>
  );
}
