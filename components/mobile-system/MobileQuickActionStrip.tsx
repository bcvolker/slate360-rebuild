"use client";

import type { ElementType } from "react";
import { mobileTokens, type MobileQuickActionAccent } from "./mobileTokens";
import {
  MobileHomeActionCard,
  MobileHomeActionGrid,
} from "./MobileHomeActionCard";

export type MobileQuickActionItem = {
  label: string;
  icon: ElementType;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** @deprecated Accent is unified — all shells use mobileHomeActionCard tokens */
  accent?: MobileQuickActionAccent;
  "aria-label"?: string;
};

type MobileQuickActionStripProps = {
  actions: MobileQuickActionItem[];
  className?: string;
  cardClassName?: string;
  iconWrapperClassName?: string;
  iconClassName?: string;
  titleClassName?: string;
};

/** Shared 2×2 quick action grid — same cards as module homes and launcher tiles. */
export function MobileQuickActionStrip({
  actions,
  className,
  cardClassName,
  iconWrapperClassName,
  iconClassName,
  titleClassName,
}: MobileQuickActionStripProps) {
  return (
    <MobileHomeActionGrid
      className={className}
      aria-label="Quick actions"
      data-testid="mobile-quick-action-grid"
    >
      {actions.map((action) => (
        <MobileHomeActionCard
          key={action.label}
          title={action.label}
          icon={action.icon}
          href={action.href}
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action["aria-label"]}
          className={cardClassName}
          iconWrapperClassName={iconWrapperClassName}
          iconClassName={iconClassName}
          titleClassName={titleClassName}
        />
      ))}
    </MobileHomeActionGrid>
  );
}
