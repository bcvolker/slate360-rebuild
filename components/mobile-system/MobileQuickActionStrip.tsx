"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens, type MobileQuickActionAccent } from "./mobileTokens";

export type MobileQuickActionItem = {
  label: string;
  icon: ElementType;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: MobileQuickActionAccent;
  "aria-label"?: string;
};

const accentIconClass: Record<MobileQuickActionAccent, string> = {
  primary: mobileTokens.mobileQuickActionIcon,
  info: mobileTokens.mobileQuickActionIcon,
  neutral: mobileTokens.mobileQuickActionIcon,
  muted: mobileTokens.mobileQuickActionIcon,
  warm: mobileTokens.mobileQuickActionIcon,
};

type MobileQuickActionStripProps = {
  actions: MobileQuickActionItem[];
  className?: string;
};

/** /app Quick Actions — compact 2×2 grid (not a single-row strip). */
export function MobileQuickActionStrip({ actions, className }: MobileQuickActionStripProps) {
  return (
    <div
      data-testid="mobile-quick-action-grid"
      data-app-quick-action-layout="grid-2x2"
      className={cn(mobileTokens.mobileQuickActionGrid, className)}
      role="toolbar"
      aria-label="Quick actions"
    >
      {actions.map((action) => (
        <QuickActionButton key={action.label} {...action} />
      ))}
    </div>
  );
}

function QuickActionButton({
  label,
  icon: Icon,
  href,
  onClick,
  disabled = false,
  accent = "neutral",
  "aria-label": ariaLabel,
}: MobileQuickActionItem) {
  const base = cn(
    mobileTokens.mobileQuickActionCardApp,
    mobileTokens.focusRing,
    disabled && "pointer-events-none opacity-50",
  );

  const inner = (
    <>
      <Icon
        className={accentIconClass[accent]}
        aria-hidden
      />
      <span className={mobileTokens.mobileQuickActionLabel}>{label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={base} aria-label={ariaLabel ?? label}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={base}
      aria-label={ariaLabel ?? label}
    >
      {inner}
    </button>
  );
}
