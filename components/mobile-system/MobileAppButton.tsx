"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens, type MobileAppAccent } from "./mobileTokens";
import type { ElementType } from "react";

export interface MobileAppButtonProps {
  title: string;
  subtitle?: string;
  icon: ElementType;
  href?: string;
  badge?: string;
  disabled?: boolean;
  /** Locked app tile — clickable when onPress is set (no navigation). */
  locked?: boolean;
  onPress?: () => void;
  /** Unified teal accent for all app launcher tiles */
  accent?: MobileAppAccent;
  className?: string;
}

const accentIconWrapper: Record<MobileAppAccent, string> = {
  primary: mobileTokens.mobileIconChip,
  info: mobileTokens.mobileIconChip,
  neutral: mobileTokens.mobileIconChip,
};

const accentBorderClass: Record<MobileAppAccent, string | undefined> = {
  primary: undefined,
  info: undefined,
  neutral: undefined,
};

export function MobileAppButton({
  title,
  subtitle,
  icon: Icon,
  href,
  badge,
  disabled = false,
  locked = false,
  onPress,
  accent = "primary",
  className,
}: MobileAppButtonProps) {
  const isInteractiveLocked = locked && Boolean(onPress);
  const base = cn(
    mobileTokens.appButtonBase,
    mobileTokens.mobileAppLauncherTileHeight,
    accentBorderClass[accent],
    mobileTokens.focusRing,
    locked && !isInteractiveLocked && "pointer-events-none opacity-50",
    locked && isInteractiveLocked && "cursor-pointer opacity-90 hover:border-white/15 hover:bg-white/[0.08]",
    disabled && !locked && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      <span className={cn(mobileTokens.appButtonIconWrapper, accentIconWrapper[accent])}>
        <Icon className={mobileTokens.appButtonIconClass} />
      </span>
      <p className={mobileTokens.appButtonTitleClass}>{title}</p>
      {subtitle && <p className={mobileTokens.appButtonSubtitleClass}>{subtitle}</p>}
      {badge && <span className={mobileTokens.appBadgeInfo}>{badge}</span>}
    </>
  );

  if (href && !disabled && !locked) {
    return (
      <Link href={href} className={base} data-testid="mobile-app-button">
        {inner}
      </Link>
    );
  }

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={base}
        data-testid="mobile-app-button"
        aria-label={locked ? `${title} — ${badge ?? "not available yet"}` : title}
        aria-disabled={locked ? true : undefined}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={base} data-testid="mobile-app-button" aria-disabled={disabled || locked}>
      {inner}
    </div>
  );
}
