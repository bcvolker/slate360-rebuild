import "server-only";

import { APP_STORE_MODE } from "@/lib/app-store-mode";
import type { Entitlements } from "@/lib/entitlements";
import type { DigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";
import type { MobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import type { MobileLauncherAppAccent, MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";

export type { MobileLauncherAppAccent, MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";

type LauncherContext = {
  entitlements: Entitlements;
  twin: DigitalTwinEntitlement;
  homeData: MobileAppHomeData;
};

type AppDefinition = {
  id: string;
  title: string;
  subtext: string;
  href: string;
  accent: MobileLauncherAppAccent;
  entitlementKey: string;
  upsellBullets: [string, string, string];
  inScope: (ctx: LauncherContext) => boolean;
  isEntitled: (ctx: LauncherContext) => boolean;
  isPurchasable: (ctx: LauncherContext) => boolean;
  statusSubline: (home: MobileAppHomeData) => string | null;
};

const APP_DEFINITIONS: AppDefinition[] = [
  {
    id: "site-walk",
    title: "Site Walk",
    subtext: "Capture photos and map pins to plans.",
    href: "/site-walk",
    accent: "primary",
    entitlementKey: "canAccessStandalonePunchwalk",
    upsellBullets: [
      "Pin photos and notes to plan sheets in the field.",
      "Assign trades, priorities, and deliverables per stop.",
      "Sync walks offline and publish client-ready reports.",
    ],
    inScope: () => true,
    isEntitled: ({ entitlements }) => entitlements.canAccessStandalonePunchwalk,
    isPurchasable: () => true,
    statusSubline: (home) => {
      if (home.hubSummary.unsyncedItems > 0) {
        return `${home.hubSummary.unsyncedItems} item${home.hubSummary.unsyncedItems === 1 ? "" : "s"} pending sync`;
      }
      if (home.hubSummary.openItems > 0) {
        return `${home.hubSummary.openItems} open field item${home.hubSummary.openItems === 1 ? "" : "s"}`;
      }
      const walks = home.recentWalks.length;
      if (walks > 0) return `${walks} recent walk${walks === 1 ? "" : "s"}`;
      return null;
    },
  },
  {
    id: "twin-360",
    title: "Twin 360",
    subtext: "Interactive 3D reality studio.",
    href: "/digital-twin",
    accent: "info",
    entitlementKey: "resolveDigitalTwinEntitlement",
    upsellBullets: [
      "Upload captures and build interactive 3D twins.",
      "Track processing jobs and spaces from the field.",
      "Share reality models with project stakeholders.",
    ],
    inScope: ({ twin }) =>
      !APP_STORE_MODE || twin.allowed || twin.subscriptionTier !== "none",
    isEntitled: ({ twin }) => twin.allowed,
    isPurchasable: () => true,
    statusSubline: () => null,
  },
  {
    id: "360-tours",
    title: "360 Tours",
    subtext: "Immersive tours and hotspot publishing.",
    href: "/tour-builder",
    accent: "info",
    entitlementKey: "canAccessStandaloneTourBuilder",
    upsellBullets: [
      "Publish panoramic scenes and interactive hotspots.",
      "Embed tours in Site Walk deliverables.",
      "Export branded tour packages for clients.",
    ],
    inScope: () => !APP_STORE_MODE,
    isEntitled: ({ entitlements }) => entitlements.canAccessStandaloneTourBuilder,
    isPurchasable: () => true,
    statusSubline: () => null,
  },
  {
    id: "design-studio",
    title: "Design Studio",
    subtext: "Models, drawings, and review attachments.",
    href: "/design-studio",
    accent: "info",
    entitlementKey: "canAccessStandaloneDesignStudio",
    upsellBullets: [
      "Manage BIM and drawing packages per project.",
      "Attach review models to field workflows.",
      "Export coordinated design deliverables.",
    ],
    inScope: () => !APP_STORE_MODE,
    isEntitled: ({ entitlements }) => entitlements.canAccessStandaloneDesignStudio,
    isPurchasable: () => true,
    statusSubline: () => null,
  },
  {
    id: "content-studio",
    title: "Content Studio",
    subtext: "Polished media and branded exports.",
    href: "/content-studio",
    accent: "info",
    entitlementKey: "canAccessStandaloneContentStudio",
    upsellBullets: [
      "Organize raw media and edit sequences.",
      "Produce branded exports for stakeholders.",
      "Feed polished assets into Site Walk reports.",
    ],
    inScope: () => !APP_STORE_MODE,
    isEntitled: ({ entitlements }) => entitlements.canAccessStandaloneContentStudio,
    isPurchasable: () => true,
    statusSubline: () => null,
  },
  {
    id: "slatedrop",
    title: "SlateDrop",
    subtext: "Plans, photos, and shared field files.",
    href: "/slatedrop",
    accent: "primary",
    entitlementKey: "canAccessHub",
    upsellBullets: [
      "Centralize plans, photos, and field uploads.",
      "Share folders with collaborators and clients.",
      "Track storage usage across active projects.",
    ],
    inScope: () => !APP_STORE_MODE,
    isEntitled: ({ entitlements }) => entitlements.canAccessHub,
    isPurchasable: () => true,
    statusSubline: (home) => {
      const queue = home.processingQueue.length;
      if (queue > 0) return `${queue} file${queue === 1 ? "" : "s"} processing`;
      const recent = home.recentSlateDrop.length;
      if (recent > 0) return `${recent} recent upload${recent === 1 ? "" : "s"}`;
      return null;
    },
  },
];

export function buildMobileLauncherApps(
  entitlements: Entitlements,
  twin: DigitalTwinEntitlement,
  homeData: MobileAppHomeData,
): MobileLauncherAppView[] {
  const ctx: LauncherContext = { entitlements, twin, homeData };
  const views: MobileLauncherAppView[] = [];

  for (const app of APP_DEFINITIONS) {
    if (!app.inScope(ctx)) continue;

    const entitled = app.isEntitled(ctx);
    if (entitled) {
      views.push({
        id: app.id,
        title: app.title,
        subtext: app.subtext,
        statusSubline: app.statusSubline(homeData),
        href: app.href,
        accent: app.accent,
        access: "entitled",
        entitlementKey: app.entitlementKey,
        upsellBullets: app.upsellBullets,
      });
      continue;
    }

    if (app.isPurchasable(ctx)) {
      views.push({
        id: app.id,
        title: app.title,
        subtext: app.subtext,
        statusSubline: null,
        href: app.href,
        accent: app.accent,
        access: "upsell",
        entitlementKey: app.entitlementKey,
        upsellBullets: app.upsellBullets,
      });
    }
  }

  return views;
}
