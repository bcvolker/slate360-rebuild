"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Globe } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
}

export default function GeospatialShell({ user, tier, isCeo }: Props) {
  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      isCeo={isCeo}
      title="Geospatial"
      icon={Globe}
      accent="#1E3A8A"
      status="coming-soon"
    >
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
        <p className="text-sm font-semibold text-gray-700 mb-1">Coming Soon</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          Geospatial &amp; Robotics — drone flight planning, point cloud processing,
          GIS mapping, and volumetric analysis — is planned for a future development phase.
          You&apos;ll be notified when it launches.
        </p>
      </div>
    </DashboardTabShell>
  );
}
