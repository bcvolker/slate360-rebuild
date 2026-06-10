"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppIcon } from "@/lib/types/app-icon";
import {
  AppWindow,
  Box,
  Brush,
  Camera,
  ChevronRight,
  Cloud,
  Compass,
  Lock,
} from "lucide-react";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { cn } from "@/lib/utils";
import type { MobileLauncherAppAccent, MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";
import { MobileAppLauncherUpsellSheet } from "./MobileAppLauncherUpsellSheet";

const LAUNCHER_ICONS: Record<string, AppIcon> = {
  "site-walk": Camera,
  "twin-360": AppWindow,
  "360-tours": Compass,
  "design-studio": Box,
  "content-studio": Brush,
  slatedrop: Cloud,
};

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
} as const satisfies Record<
  MobileLauncherAppAccent,
  {
    tile: string;
    iconChip: string;
    icon: string;
    status: string;
    chevron: string;
  }
>;

type MobileAppLauncherGridProps = {
  apps: MobileLauncherAppView[];
};

export function MobileAppLauncherGrid({ apps }: MobileAppLauncherGridProps) {
  const [upsellApp, setUpsellApp] = useState<MobileLauncherAppView | null>(null);
  if (apps.length === 0) return null;

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
      <div className={appHomeTokens.launcherStack} data-testid="launcher-layout-1">
        <LauncherTile app={apps[0]!} onUpsell={onUpsell} />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className={appHomeTokens.launcherStack} data-testid="launcher-layout-2">
        {apps.map((app) => (
          <LauncherTile key={app.id} app={app} onUpsell={onUpsell} />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={appHomeTokens.launcherStack} data-testid="launcher-layout-3">
        <LauncherTile app={apps[0]!} onUpsell={onUpsell} />
        <div className={appHomeTokens.launcherPairRow}>
          {apps.slice(1).map((app) => (
            <LauncherTile key={app.id} app={app} compact onUpsell={onUpsell} />
          ))}
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className={appHomeTokens.launcherQuadGrid} data-testid="launcher-layout-4">
        {apps.map((app) => (
          <LauncherTile key={app.id} app={app} compact onUpsell={onUpsell} />
        ))}
      </div>
    );
  }

  const head = apps.slice(0, 4);
  const tail = apps.slice(4);

  return (
    <div className={appHomeTokens.launcherStack} data-testid="launcher-layout-5plus">
      <div className={appHomeTokens.launcherQuadGrid}>
        {head.map((app) => (
          <LauncherTile key={app.id} app={app} compact onUpsell={onUpsell} />
        ))}
      </div>
      <div className={appHomeTokens.launcherRail}>
        {tail.map((app) => (
          <div key={app.id} className={appHomeTokens.launcherRailTile}>
            <LauncherTile app={app} onUpsell={onUpsell} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LauncherTile({
  app,
  compact = false,
  onUpsell,
}: {
  app: MobileLauncherAppView;
  compact?: boolean;
  onUpsell: (app: MobileLauncherAppView) => void;
}) {
  const Icon = LAUNCHER_ICONS[app.id] ?? AppWindow;
  const styles = ACCENT_STYLES[app.accent];
  const locked = app.access === "upsell";
  const status =
    locked
      ? "Add to workspace to launch"
      : app.statusSubline ?? (compact ? "Open" : "Ready when you are");

  const className = cn(
    appHomeTokens.launcherTileBase,
    styles.tile,
    locked && appHomeTokens.launcherTileLocked,
    "relative",
  );

  const body = (
    <>
      {locked ? (
        <span className={appHomeTokens.launcherLockBadge} aria-hidden>
          <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      ) : null}
      <span className={styles.iconChip} aria-hidden>
        <Icon className={styles.icon} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(appHomeTokens.launcherTitle, "block")}>{app.title}</span>
        <span className={cn(styles.status, "mt-0.5 block")}>{status}</span>
      </span>
      <ChevronRight className={styles.chevron} strokeWidth={2} aria-hidden />
    </>
  );

  if (locked) {
    return (
      <button
        type="button"
        className={className}
        aria-label={`${app.title} — upgrade required`}
        onClick={() => onUpsell(app)}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href={app.href} className={className} aria-label={`Open ${app.title}`}>
      {body}
    </Link>
  );
}
