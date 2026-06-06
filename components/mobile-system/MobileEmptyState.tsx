"use client";

/**
 * MobileEmptyState — shared empty state component for mobile panels.
 *
 * Replaces:
 *  - Inline ActivityEmptyState in CommandCenterContent (/app)
 *  - EmptyList utility in v1-view-utils (/site-walk HomeView)
 *
 * One standard geometry so /app and /site-walk empty states match.
 *
 * Slice 1: component created only. No consumers changed yet.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
import type { AppIcon } from "@/lib/types/app-icon";

interface MobileEmptyStateProps {
  /** Optional icon to display above the title. */
  icon?: AppIcon;
  /** Tighter geometry for collapsed expandable dock previews. */
  compact?: boolean;
  /** Primary empty state message. */
  title: string;
  /** Optional secondary description. */
  description?: string;
  /** CTA label. Requires either actionHref or onAction. */
  actionLabel?: string;
  /** Routes via Link when provided. */
  actionHref?: string;
  /** Fires a callback when no href is provided. */
  onAction?: () => void;
  className?: string;
  actionClassName?: string;
}

export function MobileEmptyState({
  icon: Icon,
  compact = false,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  actionClassName,
}: MobileEmptyStateProps) {
  const actionStyles = actionClassName ?? mobileTokens.emptyStateAction;
  return (
    <div
      className={cn(
        compact ? mobileTokens.emptyStateWrapperCompact : mobileTokens.emptyStateWrapper,
        className,
      )}
    >
      {Icon && <Icon className={mobileTokens.emptyStateIcon} />}

      <p className={mobileTokens.emptyStateText}>{title}</p>

      {description && (
        <p className="text-[11px] text-zinc-300 leading-snug">{description}</p>
      )}

      {actionLabel && actionHref && (
        <Link href={actionHref} className={actionStyles}>
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className={actionStyles}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
