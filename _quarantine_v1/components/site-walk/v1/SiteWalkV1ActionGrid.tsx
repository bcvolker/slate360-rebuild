"use client";

import { Camera, MapPin, Play, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens, type MobileQuickActionAccent } from "@/components/mobile-system/mobileTokens";

type SiteWalkV1ActionGridProps = {
  onQuickCapture?: () => void;
  onNewWorksite?: () => void;
  onWalkFromWorksite?: () => void;
  onReviewDeliver?: () => void;
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
  subtext: string;
  icon: typeof Camera;
  accent: MobileQuickActionAccent;
  onClick: () => void;
};

function ActionCard({ label, subtext, icon: Icon, accent, onClick }: ActionSpec) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(mobileTokens.siteWalkActionGridButton, mobileTokens.focusRing)}
      aria-label={`${label} — ${subtext}`}
    >
      <span className={cn(mobileTokens.siteWalkActionGridIcon, accentIconClass[accent])} aria-hidden>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={mobileTokens.siteWalkActionGridLabel}>{label}</span>
      <span className={mobileTokens.siteWalkActionGridSubtext}>{subtext}</span>
    </button>
  );
}

/** Site Walk home — compact 2×2 action grid with subtext (no flex-grow stretch). */
export function SiteWalkV1ActionGrid({
  onQuickCapture,
  onNewWorksite,
  onWalkFromWorksite,
  onReviewDeliver,
  className,
}: SiteWalkV1ActionGridProps) {
  const actions: ActionSpec[] = [];
  if (onQuickCapture) {
    actions.push({
      label: "Quick Walk",
      subtext: "Start capturing now",
      icon: Camera,
      accent: "warm",
      onClick: onQuickCapture,
    });
  }
  if (onNewWorksite) {
    actions.push({
      label: "New Worksite",
      subtext: "Create field project",
      icon: MapPin,
      accent: "primary",
      onClick: onNewWorksite,
    });
  }
  if (onWalkFromWorksite) {
    actions.push({
      label: "Walk from Worksite",
      subtext: "Use saved context",
      icon: Play,
      accent: "info",
      onClick: onWalkFromWorksite,
    });
  }
  if (onReviewDeliver) {
    actions.push({
      label: "Review & Deliver",
      subtext: "Reports and outputs",
      icon: Package,
      accent: "neutral",
      onClick: onReviewDeliver,
    });
  }

  return (
    <div
      data-testid="site-walk-action-grid"
      data-site-walk-action-layout="grid-2x2"
      className={cn(mobileTokens.siteWalkActionGridRow, className)}
      role="toolbar"
      aria-label="Site Walk actions"
    >
      {actions.map((action) => (
        <ActionCard key={action.label} {...action} />
      ))}
    </div>
  );
}
