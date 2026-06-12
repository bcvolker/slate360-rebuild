"use client";

import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import type { AppIcon } from "@/lib/types/app-icon";
import type { MobileQuickActionAccent } from "./mobileTokens";
import {
  MobileHomeActionCard,
  MobileHomeActionGrid,
} from "./MobileHomeActionCard";

export type MobileQuickActionItem = {
  label: string;
  icon: AppIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** @deprecated Per-item accent — route-scoped CSS vars drive chip color on each shell */
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

/** Shared 2×2 quick action grid — matches /app home card anatomy on every shell. */
export function MobileQuickActionStrip({
  actions,
  className = appHomeTokens.quickActionGrid,
  cardClassName = appHomeTokens.quickActionCard,
  iconWrapperClassName = appHomeTokens.quickActionIconWrapper,
  iconClassName = appHomeTokens.quickActionIcon,
  titleClassName = appHomeTokens.quickActionLabel,
}: MobileQuickActionStripProps) {
  return (
    <MobileHomeActionGrid
      className={className}
      aria-label="Quick actions"
      data-testid="mobile-quick-action-strip"
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
