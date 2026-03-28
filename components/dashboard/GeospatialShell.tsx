"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Globe } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
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
      status="coming-soon"
      requiredTier="model"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-white mb-1">Coming Soon</p>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Geospatial &amp; Robotics — drone flight planning, point cloud processing,
          GIS mapping, and volumetric analysis — is planned for a future development phase.
          You&apos;ll be notified when it launches.
        </p>
      </div>
    </DashboardTabShell>
  );
}
