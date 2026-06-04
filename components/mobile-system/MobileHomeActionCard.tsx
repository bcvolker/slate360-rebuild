"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens, type MobileQuickActionAccent } from "./mobileTokens";

export type MobileHomeActionCardProps = {
  title: string;
  subtext?: string;
  icon: ElementType;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Green (primary) or blue (info) quick-action accent */
  accent?: Extract<MobileQuickActionAccent, "primary" | "info">;
  "aria-label"?: string;
  className?: string;
  iconWrapperClassName?: string;
  iconClassName?: string;
  titleClassName?: string;
  subtextClassName?: string;
};

/** Shared home action card — launcher tiles and quick actions (all shells). */
export function MobileHomeActionCard({
  title,
  subtext,
  icon: Icon,
  href,
  onClick,
  disabled = false,
  selected = false,
  accent = "primary",
  "aria-label": ariaLabel,
  className,
  iconWrapperClassName,
  iconClassName,
  titleClassName,
  subtextClassName,
}: MobileHomeActionCardProps) {
  const isInfo = accent === "info";
  const cardClass = cn(
    className ?? mobileTokens.mobileHomeActionCard,
    selected && mobileTokens.mobileHomeActionCardSelected,
    mobileTokens.focusRing,
    disabled && "pointer-events-none opacity-50",
  );

  const inner = (
    <>
      <span
        className={
          iconWrapperClassName ??
          (isInfo
            ? mobileTokens.mobileHomeActionIconWrapperInfo
            : mobileTokens.mobileHomeActionIconWrapper)
        }
        aria-hidden
      >
        <Icon
          className={
            iconClassName ??
            (isInfo ? mobileTokens.mobileHomeActionIconInfo : mobileTokens.mobileHomeActionIcon)
          }
          strokeWidth={1.75}
        />
      </span>
      <span
        className={
          titleClassName ??
          (isInfo ? mobileTokens.mobileHomeActionTitleInfo : mobileTokens.mobileHomeActionTitle)
        }
      >
        {title}
      </span>
      {subtext ? (
        <span className={subtextClassName ?? mobileTokens.mobileHomeActionSubtext}>
          {subtext}
        </span>
      ) : null}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cardClass} aria-label={ariaLabel ?? title}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cardClass}
        aria-label={ariaLabel ?? title}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={cardClass} aria-label={ariaLabel ?? title}>
      {inner}
    </div>
  );
}

type MobileHomeActionGridProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

/** Shared 2×2 action grid — launcher and quick actions (all shells). */
export function MobileHomeActionGrid({
  children,
  className,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: MobileHomeActionGridProps) {
  return (
    <div
      className={cn(mobileTokens.mobileHomeActionGrid, className)}
      role={ariaLabel ? "toolbar" : "group"}
      aria-label={ariaLabel}
      data-testid={dataTestId}
    >
      {children}
    </div>
  );
}
