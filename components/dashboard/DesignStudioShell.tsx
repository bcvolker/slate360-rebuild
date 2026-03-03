"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Palette } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
}

export default function DesignStudioShell({ user, tier, isCeo }: Props) {
  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      isCeo={isCeo}
      title="Design Studio"
      icon={Palette}
      accent="#FF4D00"
      status="under-development"
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
        <p className="text-sm font-semibold text-amber-900 mb-1">Currently Under Development</p>
        <p className="text-sm text-amber-800 leading-relaxed">
          Design Studio is actively being built. The 3D viewer, BIM overlay system, and
          GPU-powered processing pipeline are in place. Full tooling will roll out
          incrementally — check back over the coming weeks for early access.
        </p>
      </div>
    </DashboardTabShell>
  );
}
