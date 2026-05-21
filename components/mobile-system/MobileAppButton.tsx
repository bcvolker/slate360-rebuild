"use client";

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
    mobileTokens.focusRing,
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      <span className={mobileTokens.appButtonIconWrapper}>
        <Icon className={mobileTokens.appButtonIconClass} />
      </span>
      <p className={mobileTokens.appButtonTitleClass}>{title}</p>
      {subtitle && <p className={mobileTokens.appButtonSubtitleClass}>{subtitle}</p>}
      {badge && (
        <span className="mt-0.5 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-400">
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
