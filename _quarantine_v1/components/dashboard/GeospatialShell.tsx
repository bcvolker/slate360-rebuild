"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Globe } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function GeospatialShell({ user, tier, isCeo, internalAccess }: Props) {
  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      isCeo={isCeo}
      internalAccess={internalAccess}
      title="Geospatial"
      icon={Globe}
      accent="#059669"
      status="under-development"
      requiredTier="standard"
    >
      <div className="flex flex-col items-center justify-center rounded-2xl border border-app bg-app-card py-16">
        <Globe size={32} className="text-zinc-600 mb-3" />
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">In Development</p>
      </div>
    </DashboardTabShell>
  );
}
