"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { Layers } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
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
      accent="#FF4D00"
      status="coming-soon"
    >
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
        <p className="text-sm font-semibold text-gray-700 mb-1">Coming Soon</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          Content Studio — renderings, walkthrough videos, AI-assisted editing, and
          asset management — is planned for a future development phase.
          You&apos;ll be notified when it launches.
        </p>
      </div>
    </DashboardTabShell>
  );
}
