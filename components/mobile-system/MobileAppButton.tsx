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
  /** primary = Site Walk (amber), info = Twin/cyan, neutral = default */
  accent?: MobileAppAccent;
  className?: string;
}

const accentIconWrapper: Record<MobileAppAccent, string> = {
  primary: mobileTokens.mobileIconBgPrimary,
  info: mobileTokens.mobileIconBgInfo,
  neutral: mobileTokens.mobileIconBgNeutral,
};

export function MobileAppButton({
  title,
  subtitle,
  icon: Icon,
  href,
  badge,
  disabled = false,
  accent = "primary",
  className,
}: MobileAppButtonProps) {
  const base = cn(
    mobileTokens.appButtonBase,
    mobileTokens.mobileAppLauncherTileHeight,
    accent === "primary" && mobileTokens.mobileBrandWarmGlow,
    mobileTokens.focusRing,
    disabled && "pointer-events-none opacity-50",
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

  if (href && !disabled) {
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
