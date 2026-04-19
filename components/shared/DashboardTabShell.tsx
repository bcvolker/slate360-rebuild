"use client";

import { useState } from "react";
import { type LucideIcon } from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import UpgradeGate from "@/components/shared/UpgradeGate";
import TrialBanner from "@/components/shared/TrialBanner";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import { type Tier, tierMeetsRequirement } from "@/lib/entitlements";

export type TabStatus = "coming-soon" | "under-development" | "live";

export interface DashboardTabShellProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  title: string;
  icon?: LucideIcon;
  accent?: string;
  status?: TabStatus;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
  /** Minimum tier required to use this tab. When set, shows UpgradeGate for lower tiers. */
  requiredTier?: Tier;
  showCustomize?: boolean;
  children?: React.ReactNode;
}

export default function DashboardTabShell({
  user,
  tier,
  title,
  icon: Icon,
  accent = "#F59E0B",
  status = "coming-soon",
  isCeo = false,
  internalAccess,
  requiredTier,
  showCustomize = true,
  children,
}: DashboardTabShellProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const isTrial = tier === "trial";
  const isLocked = !isTrial && requiredTier ? !tierMeetsRequirement(tier, requiredTier) : false;

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">

      {/* Shared header — identical to dashboard home */}
      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        internalAccess={internalAccess}
        showBackLink
        searchPlaceholder={`Search ${title}\u2026`}
        onCustomizeOpen={showCustomize ? () => setCustomizeOpen(true) : undefined}
      />

      {/* MAIN */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden space-y-6">

        {/* Page-header row */}
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              <Icon size={24} />
            </div>
          )}
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
            {status === "under-development" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-900/30 text-amber-400 border border-amber-700/50">
                Under Development
              </span>
            )}
            {status === "coming-soon" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/[0.04] text-zinc-400 border border-app">
                Coming Soon
              </span>
            )}
          </div>
        </div>

        {isLocked && requiredTier ? (
          <UpgradeGate
            feature={title}
            requiredTier={requiredTier}
            currentTier={tier}
            accent={accent}
            icon={Icon}
          />
        ) : (
          <>
            {tier === "trial" && <TrialBanner feature={title} accent={accent} />}
            {children}
          </>
        )}
      </main>

      {/* CUSTOMIZE DRAWER */}
      {showCustomize && (
        <WidgetCustomizeDrawer
          open={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          title={`Customize ${title}`}
          subtitle="Widget customization will be available when this module launches"
          widgetPrefs={[]}
          widgetMeta={[]}
          onToggleVisible={() => {}}
          onSetSize={() => {}}
          onMoveOrder={() => {}}
          onReset={() => {}}
        />
      )}
    </div>
  );
}
