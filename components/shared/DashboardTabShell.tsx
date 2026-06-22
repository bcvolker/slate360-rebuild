"use client";

import { useState } from "react";
import { type LucideIcon } from "lucide-react";
import UpgradeGate from "@/components/shared/UpgradeGate";
import TrialBanner from "@/components/shared/TrialBanner";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import { type Tier, tierMeetsRequirement } from "@/lib/entitlements";

export type TabStatus = "under-development" | "live";

export interface DashboardTabShellProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  title: string;
  icon?: LucideIcon;
  accent?: string;
  /** @default "var(--graphite-primary)" */
  status?: TabStatus;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
  /** Minimum tier required to use this tab. When set, shows UpgradeGate for lower tiers. */
  requiredTier?: Tier;
  showCustomize?: boolean;
  /**
   * Fill the chrome's content height instead of growing the page. Use for
   * board/sub-tab layouts that manage their own internal scroll — eliminates
   * the page-level vertical scroll and full-width side gaps.
   */
  fill?: boolean;
  children?: React.ReactNode;
}

export default function DashboardTabShell({
  user,
  tier,
  title,
  icon: Icon,
  accent = "var(--graphite-primary)",
  status = "live",
  isCeo = false,
  internalAccess,
  requiredTier,
  showCustomize = true,
  fill = false,
  children,
}: DashboardTabShellProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const isTrial = tier === "trial";
  const isLocked = !isTrial && requiredTier ? !tierMeetsRequirement(tier, requiredTier) : false;

  return (
    <div className={fill ? "flex h-full min-h-0 flex-col overflow-x-hidden" : "overflow-x-hidden"}>

      {/* MAIN — chrome is provided by AppShell; we only paint page content */}
      <main
        className={
          fill
            ? "mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 overflow-x-hidden px-4 py-5 sm:px-6"
            : "max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden space-y-6"
        }
      >

        {/* Page-header row */}
        <div className="flex shrink-0 items-center gap-4">
          {Icon && (
            <div
              className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              <Icon size={24} />
            </div>
          )}
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
            {status === "under-development" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/[0.05] text-[var(--graphite-muted)] border border-white/10">
                Under Development
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
            {fill ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
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
