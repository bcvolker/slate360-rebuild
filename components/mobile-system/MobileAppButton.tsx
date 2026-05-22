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
  /** primary = Site Walk (amber), info = Twin/cyan, neutral = default */
  accent?: MobileAppAccent;
  className?: string;
}

const accentIconWrapper: Record<MobileAppAccent, string> = {
  primary: mobileTokens.mobileIconBgPrimary,
  info: mobileTokens.mobileIconBgInfo,
  neutral: mobileTokens.mobileIconBgNeutral,
};

const accentBorderClass: Record<MobileAppAccent, string | undefined> = {
  primary: mobileTokens.mobileBrandWarmBorder,
  info: "border-cyan-500/20",
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
    accent === "primary" && mobileTokens.mobileBrandWarmGlow,
    accent === "info" && mobileTokens.mobileBrandCoolGlow,
    mobileTokens.focusRing,
    locked && !isInteractiveLocked && "pointer-events-none opacity-50",
    locked && isInteractiveLocked && "cursor-pointer opacity-90 hover:border-cyan-500/25 hover:bg-white/[0.07]",
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
