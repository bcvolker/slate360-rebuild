"use client";

import React, { useState, useCallback } from "react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import MarketCustomizeDrawer from "@/components/dashboard/market/MarketCustomizeDrawer";
import { useMarketLayoutPrefs } from "@/lib/hooks/useMarketLayoutPrefs";
import type { Tier } from "@/lib/entitlements";

type MarketRouteShellProps = {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
  children: React.ReactNode;
};

export type MarketShellContext = ReturnType<typeof useMarketLayoutPrefs>;

export default function MarketRouteShell({ user, tier, isCeo, internalAccess, children }: MarketRouteShellProps) {
  const layoutPrefs = useMarketLayoutPrefs();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const openCustomize = useCallback(() => setCustomizeOpen(true), []);
  const closeCustomize = useCallback(() => setCustomizeOpen(false), []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#020617,#0f172a_28%,#111827_100%)]">
      <div className="relative">
        <DashboardHeader
          user={user}
          tier={tier}
          isCeo={isCeo}
          internalAccess={internalAccess}
          showBackLink
          searchPlaceholder="Search Market Robot..."
          onCustomizeOpen={openCustomize}
          prefsDirty={layoutPrefs.isDirty}
        />
        <MarketCustomizeDrawer
          tabs={layoutPrefs.prefs.tabs}
          mode={layoutPrefs.prefs.mode}
          open={customizeOpen}
          onClose={closeCustomize}
          onReorder={layoutPrefs.reorderTab}
          onToggleVisibility={layoutPrefs.toggleTabVisibility}
          onModeChange={layoutPrefs.setMode}
          onReset={layoutPrefs.resetToDefaults}
        />
      </div>

      <main className="mx-auto max-w-[1440px] overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ layoutPrefs?: MarketShellContext }>, {
              layoutPrefs,
            });
          }
          return child;
        })}
      </main>
    </div>
  );
}
