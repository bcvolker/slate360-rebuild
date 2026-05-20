"use client";

/**
 * MobileActionCard — shared 2×2 action card for mobile shells.
 *
 * Used by:
 *  - /app  CommandCenterContent Quick Actions (replaces inline QuickActionCard)
 *  - /site-walk HomeView action grid (replaces SiteWalkV1ActionGrid buttons)
 *
 * Slice 1: component created only. No consumers changed yet.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
import type { ElementType } from "react";

interface MobileActionCardProps {
  icon: ElementType;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function MobileActionCard({
  icon: Icon,
  label,
  description,
  href,
  onClick,
  disabled = false,
  "aria-label": ariaLabel,
  className,
}: MobileActionCardProps) {
  const base = cn(
    mobileTokens.actionCardBase,
    mobileTokens.mobileActionCardHeight,
    mobileTokens.focusRing,
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      <Icon className={mobileTokens.actionIconClass} />
      <span className={mobileTokens.actionLabelClass}>{label}</span>
      {description && (
        <span className="text-[12px] text-zinc-400 font-medium mt-0.5 text-center leading-tight">
          {description}
        </span>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={base} aria-label={ariaLabel}>
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
      aria-label={ariaLabel}
    >
      {inner}
    </button>
  );
}
