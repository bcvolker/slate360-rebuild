"use client";

/**
 * MobileAppCard — horizontal app tile for the /app "Your Apps" section.
 *
 * Replaces the inline AppTile function in CommandCenterContent.
 * Supports optional badge for Beta/Owner Preview labels.
 * Supports href (Link) or onClick (button).
 *
 * Slice 1: component created only. No consumers changed yet.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
import type { AppIcon } from "@/lib/types/app-icon";

interface MobileAppCardProps {
  title: string;
  subtitle: string;
  icon: AppIcon;
  href?: string;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MobileAppCard({
  title,
  subtitle,
  icon: Icon,
  href,
  badge,
  disabled = false,
  onClick,
  className,
}: MobileAppCardProps) {
  const base = cn(
    mobileTokens.appCardBase,
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      <span className={mobileTokens.appCardIconWrapper}>
        <Icon className={mobileTokens.appCardIconClass} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="text-xs text-zinc-300">{subtitle}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90">
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

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={base}>
      {inner}
    </button>
  );
}
