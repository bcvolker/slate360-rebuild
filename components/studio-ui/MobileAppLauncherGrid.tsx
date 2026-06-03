"use client";

import { useState, type ElementType } from "react";
import {
  AppWindow,
  Box,
  Brush,
  Camera,
  Cloud,
  Compass,
  Lock,
} from "lucide-react";
import {
  MobileHomeActionCard,
  MobileHomeActionGrid,
  mobileTokens,
} from "@/components/mobile-system";
import { cn } from "@/lib/utils";
import type { MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";
import { MobileAppLauncherUpsellSheet } from "./MobileAppLauncherUpsellSheet";

const LAUNCHER_ICONS: Record<string, ElementType> = {
  "site-walk": Camera,
  "twin-360": AppWindow,
  "360-tours": Compass,
  "design-studio": Box,
  "content-studio": Brush,
  slatedrop: Cloud,
};

const LAUNCHER_STYLES = {
  primary: {
    card: mobileTokens.appHomeLauncherCardPrimary,
    iconWrapper: mobileTokens.appHomeLauncherIconWrapperPrimary,
    icon: mobileTokens.appHomeLauncherIconPrimary,
  },
  info: {
    card: mobileTokens.appHomeLauncherCardInfo,
    iconWrapper: mobileTokens.appHomeLauncherIconWrapperInfo,
    icon: mobileTokens.appHomeLauncherIconInfo,
  },
} as const;

type MobileAppLauncherGridProps = {
  apps: MobileLauncherAppView[];
};

export function MobileAppLauncherGrid({ apps }: MobileAppLauncherGridProps) {
  const [upsellApp, setUpsellApp] = useState<MobileLauncherAppView | null>(null);
  if (apps.length === 0) {
    return null;
  }

  return (
    <>
      <LauncherLayout apps={apps} onUpsell={setUpsellApp} />
      <MobileAppLauncherUpsellSheet app={upsellApp} onClose={() => setUpsellApp(null)} />
    </>
  );
}

function LauncherLayout({
  apps,
  onUpsell,
}: {
  apps: MobileLauncherAppView[];
  onUpsell: (app: MobileLauncherAppView) => void;
}) {
  const count = apps.length;

  if (count === 1) {
    return (
      <LauncherTile
        app={apps[0]!}
        variant="hero"
        className="w-full"
        onUpsell={onUpsell}
      />
    );
  }

  if (count === 2) {
    return (
      <div className={mobileTokens.appHomeLauncherPairGrid}>
        {apps.map((app) => (
          <LauncherTile key={app.id} app={app} onUpsell={onUpsell} />
        ))}
      </div>
    );
  }

  if (count <= 4) {
    return (
      <MobileHomeActionGrid className={mobileTokens.appHomeLauncherQuadGrid}>
        {apps.map((app) => (
          <LauncherTile key={app.id} app={app} onUpsell={onUpsell} />
        ))}
      </MobileHomeActionGrid>
    );
  }

  return (
    <div className={mobileTokens.appHomeLauncherRail}>
      {apps.map((app) => (
        <div key={app.id} className={mobileTokens.appHomeLauncherRailTile}>
          <LauncherTile app={app} onUpsell={onUpsell} />
        </div>
      ))}
    </div>
  );
}

function LauncherTile({
  app,
  variant = "tile",
  className,
  onUpsell,
}: {
  app: MobileLauncherAppView;
  variant?: "hero" | "tile";
  className?: string;
  onUpsell: (app: MobileLauncherAppView) => void;
}) {
  const Icon = LAUNCHER_ICONS[app.id] ?? AppWindow;
  const styles = LAUNCHER_STYLES[app.accent];
  const locked = app.access === "upsell";
  const subtext = locked ? "Add to your workspace to launch." : app.subtext;

  const cardClass = cn(
    styles.card,
    mobileTokens.appHomeLauncherTileRadius,
    mobileTokens.appHomeLauncherTileMinTarget,
    variant === "hero" && mobileTokens.appHomeLauncherHeroCard,
    locked && mobileTokens.appHomeLauncherLockedCard,
    className,
  );

  const body = (
    <div className={variant === "hero" ? "relative w-full" : "relative"}>
      {locked ? (
        <span className={mobileTokens.appHomeLauncherLockBadge} aria-hidden>
          <Lock className="h-4 w-4" strokeWidth={1.75} />
        </span>
      ) : null}
      <MobileHomeActionCard
        title={app.title}
        subtext={subtext}
        icon={Icon}
        href={locked ? undefined : app.href}
        onClick={locked ? () => onUpsell(app) : undefined}
        className={cardClass}
        iconWrapperClassName={styles.iconWrapper}
        iconClassName={styles.icon}
        titleClassName={mobileTokens.appHomeLauncherTitle}
        subtextClassName={mobileTokens.appHomeLauncherSubtitle}
        aria-label={
          locked ? `${app.title} — upgrade required` : `Open ${app.title}`
        }
      />
    </div>
  );

  return body;
}
