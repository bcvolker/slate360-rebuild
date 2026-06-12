"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { AppIcon } from "@/lib/types/app-icon";
import { cn } from "@/lib/utils";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";

const ACCENT_STYLES = {
  primary: {
    tile: appHomeTokens.launcherTilePrimary,
    iconChip: appHomeTokens.launcherIconChipPrimary,
    icon: appHomeTokens.launcherIconPrimary,
    status: appHomeTokens.launcherStatusPrimary,
    chevron: appHomeTokens.launcherChevronPrimary,
  },
  info: {
    tile: appHomeTokens.launcherTileInfo,
    iconChip: appHomeTokens.launcherIconChipInfo,
    icon: appHomeTokens.launcherIconInfo,
    status: appHomeTokens.launcherStatusInfo,
    chevron: appHomeTokens.launcherChevronInfo,
  },
} as const;

type MobileAppHubHeroCardProps = {
  title: string;
  subtext: string;
  icon: AppIcon;
  onClick: () => void;
  disabled?: boolean;
  accent?: keyof typeof ACCENT_STYLES;
  "aria-label": string;
};

/** Hub start hero row — same anatomy as /app launcher tiles (104px row). */
export function MobileAppHubHeroCard({
  title,
  subtext,
  icon: Icon,
  onClick,
  disabled = false,
  accent = "primary",
  "aria-label": ariaLabel,
}: MobileAppHubHeroCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        appHomeTokens.launcherTileBase,
        styles.tile,
        disabled && "disabled:opacity-60",
      )}
      aria-label={ariaLabel}
    >
      <span className={styles.iconChip} aria-hidden>
        <Icon className={styles.icon} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(appHomeTokens.launcherTitle, "block")}>{title}</span>
        <span className={cn(styles.status, "mt-0.5 block")}>{subtext}</span>
      </span>
      <ChevronRight className={styles.chevron} strokeWidth={2} aria-hidden />
    </button>
  );
}

type MobileAppHubHeroStackProps = {
  children: ReactNode;
};

export function MobileAppHubHeroStack({ children }: MobileAppHubHeroStackProps) {
  return <div className={appHomeTokens.launcherStack}>{children}</div>;
}
