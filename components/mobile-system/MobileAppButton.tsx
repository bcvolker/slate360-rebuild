"use client";

/**
 * MobileAppButton — compact vertical app launcher button for the "Your Apps" 2-col grid.
 *
 * Replaces MobileAppCard (horizontal tile) in CommandCenterContent's apps section.
 * Vertical layout: centered icon background + title + optional subtitle/badge below.
 *
 * Use inside MobileActionGrid for correct 2-col alignment on all screen sizes.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
import type { ElementType } from "react";

export interface MobileAppButtonProps {
  title: string;
  subtitle?: string;
  icon: ElementType;
  href?: string;
  badge?: string;
  disabled?: boolean;
  className?: string;
}

export function MobileAppButton({
  title,
  subtitle,
  icon: Icon,
  href,
  badge,
  disabled = false,
  className,
}: MobileAppButtonProps) {
  const base = cn(
    mobileTokens.appButtonBase,
    mobileTokens.mobileAppButtonHeight,
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      <span className={mobileTokens.appButtonIconWrapper}>
        <Icon className={mobileTokens.appButtonIconClass} />
      </span>
      <p className="text-[14px] font-semibold leading-tight text-white">{title}</p>
      {subtitle && (
        <p className="text-[12px] leading-tight text-zinc-400 mt-0.5">{subtitle}</p>
      )}
      {badge && (
        <span className="mt-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-400">
          {badge}
        </span>
      )}
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
