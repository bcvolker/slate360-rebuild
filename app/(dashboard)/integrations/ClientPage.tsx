"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import { Link2 } from "lucide-react";

interface Props {
  user: {name: string, email: string, avatar?: string};
  tier: import("@/lib/entitlements").Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function IntegrationsHubPage({ user, tier, isCeo = false, internalAccess }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        internalAccess={internalAccess}
        showBackLink
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-app bg-app-card py-16">
          <Link2 size={32} className="text-zinc-600 mb-3" />
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Integrations — In Development</p>
        </div>
      </main>
    </div>
  );
}
