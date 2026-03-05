"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import type { Tier } from "@/lib/entitlements";

type MarketRouteShellProps = {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo: boolean;
  children: React.ReactNode;
};

export default function MarketRouteShell({ user, tier, isCeo, children }: MarketRouteShellProps) {
  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">
      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        showBackLink
        searchPlaceholder="Search Market Robot..."
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
