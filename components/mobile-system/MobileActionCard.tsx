"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens, type MobileQuickActionAccent } from "./mobileTokens";
import type { ElementType } from "react";

type MobileActionCardVariant = "default" | "module";

interface MobileActionCardProps {
  icon: ElementType;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: MobileActionCardVariant;
  /** Icon accent for module variant — matches /app quick action palette */
  accent?: MobileQuickActionAccent;
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
  variant = "default",
  accent = "primary",
  "aria-label": ariaLabel,
  className,
}: MobileActionCardProps) {
  const isModule = variant === "module";

  const moduleIconWrapper: Record<MobileQuickActionAccent, string> = {
    primary: mobileTokens.mobileIconBgPrimary,
    info: mobileTokens.mobileIconBgInfo,
    neutral: mobileTokens.mobileIconBgNeutral,
    muted: mobileTokens.mobileIconBgNeutral,
    warm: mobileTokens.mobileIconBgPrimary,
  };

  const moduleIconClass: Record<MobileQuickActionAccent, string> = {
    primary: mobileTokens.moduleActionIconClass,
    info: "h-3.5 w-3.5 text-cyan-400/90",
    neutral: "h-3.5 w-3.5 text-zinc-300",
    muted: "h-3.5 w-3.5 text-zinc-300",
    warm: "h-3.5 w-3.5 text-amber-400/70",
  };

  const base = cn(
    mobileTokens.actionCardBase,
    isModule ? mobileTokens.moduleActionCardHeight : mobileTokens.mobileActionCardHeight,
    mobileTokens.focusRing,
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      {isModule ? (
        <span
          className={cn(
            "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            moduleIconWrapper[accent],
          )}
        >
          <Icon className={moduleIconClass[accent]} />
        </span>
      ) : (
        <Icon className={mobileTokens.actionIconClass} />
      )}
      <span className={mobileTokens.actionLabelClass}>{label}</span>
      {description && (
        <span className="mt-0.5 text-center text-[11px] font-medium leading-tight text-zinc-300">
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
