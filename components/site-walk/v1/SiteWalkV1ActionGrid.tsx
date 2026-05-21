"use client";

import { Plus, Play, Camera, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens, type MobileQuickActionAccent } from "@/components/mobile-system/mobileTokens";

type SiteWalkV1ActionGridProps = {
  onNewWorksite?: () => void;
  onStartWalk?: () => void;
  onQuickCapture?: () => void;
  onSearch?: () => void;
  className?: string;
};

const accentIconClass: Record<MobileQuickActionAccent, string> = {
  primary: mobileTokens.mobileAccentPrimary,
  info: mobileTokens.mobileAccentInfo,
  neutral: mobileTokens.mobileAccentNeutralBright,
  muted: mobileTokens.mobileAccentMuted,
  warm: mobileTokens.mobileAccentWarm,
};

type ActionSpec = {
  label: string;
  icon: typeof Plus;
  accent: MobileQuickActionAccent;
  onClick?: () => void;
};

function ActionButton({ label, icon: Icon, accent, onClick }: ActionSpec) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(mobileTokens.siteWalkActionGridButton, mobileTokens.focusRing)}
      aria-label={label}
    >
      <Icon className={cn(mobileTokens.quickActionStripIcon, accentIconClass[accent])} aria-hidden />
      <span className={mobileTokens.quickActionStripLabel}>{label}</span>
    </button>
  );
}

/**
 * Site Walk 2×2 action grid — uses the same quick-action token language as /app.
 */
export function SiteWalkV1ActionGrid({
  onNewWorksite,
  onStartWalk,
  onQuickCapture,
  onSearch,
  className,
}: SiteWalkV1ActionGridProps) {
  const actions: ActionSpec[] = [
    { label: "Create Worksite", icon: Plus, accent: "primary", onClick: onNewWorksite },
    { label: "Walk from Worksite", icon: Play, accent: "info", onClick: onStartWalk },
    { label: "Quick Walk", icon: Camera, accent: "warm", onClick: onQuickCapture },
    { label: "Search", icon: Search, accent: "muted", onClick: onSearch },
  ];

  return (
    <div
      data-testid="site-walk-action-grid"
      className={cn(mobileTokens.siteWalkActionGridRow, className)}
      role="toolbar"
      aria-label="Site Walk actions"
    >
      {actions.map((action) => (
        <ActionButton key={action.label} {...action} onClick={action.onClick ?? (() => {})} />
      ))}
    </div>
  );
}
