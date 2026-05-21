"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

export type MobileQuickActionItem = {
  label: string;
  icon: ElementType;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
};

type MobileQuickActionStripProps = {
  actions: MobileQuickActionItem[];
  className?: string;
};

/**
 * Compact single-row quick actions for /app (Create, SlateDrop, Deliverables, Search).
 */
export function MobileQuickActionStrip({ actions, className }: MobileQuickActionStripProps) {
  return (
    <div
      data-testid="mobile-quick-action-strip"
      className={cn(mobileTokens.quickActionStripRow, className)}
      role="toolbar"
      aria-label="Quick actions"
    >
      {actions.map((action) => (
        <QuickActionButton key={action.label} {...action} />
      ))}
    </div>
  );
}

function QuickActionButton({
  label,
  icon: Icon,
  href,
  onClick,
  disabled = false,
  "aria-label": ariaLabel,
}: MobileQuickActionItem) {
  const base = cn(
    mobileTokens.quickActionStripButton,
    mobileTokens.focusRing,
    disabled && "pointer-events-none opacity-50",
  );

  const inner = (
    <>
      <Icon className={mobileTokens.quickActionStripIcon} aria-hidden />
      <span className={mobileTokens.quickActionStripLabel}>{label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={base} aria-label={ariaLabel ?? label}>
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
      aria-label={ariaLabel ?? label}
    >
      {inner}
    </button>
  );
}
