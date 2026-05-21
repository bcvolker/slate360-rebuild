"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
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
  "aria-label": ariaLabel,
  className,
}: MobileActionCardProps) {
  const isModule = variant === "module";

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
        <span className={mobileTokens.moduleActionIconWrapper}>
          <Icon className={mobileTokens.moduleActionIconClass} />
        </span>
      ) : (
        <Icon className={mobileTokens.actionIconClass} />
      )}
      <span className={mobileTokens.actionLabelClass}>{label}</span>
      {description && (
        <span className="mt-0.5 text-center text-[11px] font-medium leading-tight text-zinc-500">
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
