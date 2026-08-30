/**
 * Client-surface visibility. Never emit locked/upsell tiles.
 * Tour Builder is never a client product name.
 * Beta-mode entitlement widening must not leak unpurchased products.
 */

export type ClientSurfaceApp =
  | "spatial-walkthrough"
  | "site-walk"
  | "twin360"
  | "slatedrop"
  | "design-studio"
  | "content-studio"
  | "thermal";

export type ClientSurfaceFlags = {
  spatialWalkthrough: boolean;
  siteWalk: boolean;
  twin360: boolean;
  slatedrop: boolean;
  designStudio: boolean;
  contentStudio: boolean;
  thermal: boolean;
  isCeo: boolean;
};

export type PurchasedClientFlags = {
  spatialWalkthrough: boolean;
  siteWalk: boolean;
  twin360: boolean;
  slatedrop: boolean;
  designStudio: boolean;
  contentStudio: boolean;
};

export function mergeClientSurfaceFlags(input: {
  isCeo: boolean;
  purchased: PurchasedClientFlags;
  betaMode: boolean;
}): ClientSurfaceFlags {
  const { isCeo, purchased, betaMode } = input;
  const spatialOnlyPurchase =
    purchased.spatialWalkthrough &&
    !purchased.siteWalk &&
    !purchased.twin360 &&
    !purchased.slatedrop &&
    !purchased.designStudio &&
    !purchased.contentStudio;

  return {
    spatialWalkthrough: isCeo || purchased.spatialWalkthrough,
    siteWalk: isCeo || purchased.siteWalk,
    twin360: isCeo || purchased.twin360 || (betaMode && purchased.siteWalk && !spatialOnlyPurchase),
    slatedrop: isCeo || purchased.slatedrop || purchased.siteWalk,
    designStudio: isCeo || purchased.designStudio,
    contentStudio: isCeo || purchased.contentStudio,
    thermal: isCeo,
    isCeo,
  };
}

export function visibleClientApps(flags: ClientSurfaceFlags): ClientSurfaceApp[] {
  const apps: ClientSurfaceApp[] = [];
  if (flags.spatialWalkthrough) apps.push("spatial-walkthrough");
  if (flags.siteWalk) apps.push("site-walk");
  if (flags.twin360) apps.push("twin360");
  if (flags.slatedrop) apps.push("slatedrop");
  if (flags.designStudio) apps.push("design-studio");
  if (flags.contentStudio) apps.push("content-studio");
  if (flags.thermal) apps.push("thermal");
  return unique(apps);
}

export function isSpatialOnlyPortal(flags: ClientSurfaceFlags): boolean {
  if (flags.isCeo) return false;
  const apps = visibleClientApps(flags);
  return apps.length === 1 && apps[0] === "spatial-walkthrough";
}

export function portalHomeHref(flags: ClientSurfaceFlags): string {
  return isSpatialOnlyPortal(flags) ? "/projects" : "/dashboard";
}

export function projectTabIdsForSurface(flags: ClientSurfaceFlags): string[] {
  const apps = visibleClientApps(flags);
  const tabs = ["overview"];
  if (apps.includes("spatial-walkthrough")) tabs.push("walkthroughs", "items");
  if (apps.includes("site-walk")) tabs.push("walks", "plans");
  if (apps.includes("twin360")) tabs.push("twins");
  if (apps.includes("spatial-walkthrough") || apps.includes("slatedrop") || apps.includes("site-walk")) {
    tabs.push("files");
  }
  if (apps.includes("site-walk")) tabs.push("deliverables");
  tabs.push("team");
  return unique(tabs);
}

export function projectTabLabel(tabId: string, flags: ClientSurfaceFlags): string | null {
  if (!isSpatialOnlyPortal(flags)) return null;
  if (tabId === "files") return "Project Files";
  if (tabId === "team") return "Sharing";
  return null;
}

export function commandPaletteHrefAllowed(href: string, flags: ClientSurfaceFlags): boolean {
  const apps = visibleClientApps(flags);
  if (href.startsWith("/spatial-walkthrough")) return apps.includes("spatial-walkthrough");
  if (href.startsWith("/site-walk")) return apps.includes("site-walk");
  if (href.startsWith("/digital-twin") || href.startsWith("/digital-twins")) return apps.includes("twin360");
  if (href.startsWith("/slatedrop")) return apps.includes("slatedrop") || apps.includes("site-walk");
  if (href.startsWith("/coordination")) return apps.includes("site-walk");
  if (href.startsWith("/thermal")) return apps.includes("thermal");
  if (href.startsWith("/content-studio")) return apps.includes("content-studio");
  if (href === "/dashboard" && isSpatialOnlyPortal(flags)) return false;
  return true;
}

export function launcherTileAllowed(tileId: string, flags: ClientSurfaceFlags): boolean {
  if (tileId === "spatial-walkthrough") return flags.spatialWalkthrough;
  if (tileId === "site-walk") return flags.siteWalk;
  if (tileId === "twin-360") return flags.twin360;
  if (tileId === "slatedrop") return flags.slatedrop;
  if (tileId === "design-studio") return flags.designStudio;
  if (tileId === "content-studio") return flags.contentStudio;
  return flags.isCeo;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
