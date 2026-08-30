/**
 * Client-surface visibility. Never emit locked/upsell tiles.
 * Tour Builder is never a client product name.
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

export function visibleClientApps(flags: ClientSurfaceFlags): ClientSurfaceApp[] {
  if (flags.isCeo) {
    const all: ClientSurfaceApp[] = [];
    if (flags.spatialWalkthrough || flags.isCeo) all.push("spatial-walkthrough");
    if (flags.siteWalk) all.push("site-walk");
    if (flags.twin360) all.push("twin360");
    if (flags.slatedrop) all.push("slatedrop");
    if (flags.designStudio) all.push("design-studio");
    if (flags.contentStudio) all.push("content-studio");
    if (flags.thermal) all.push("thermal");
    return unique(all);
  }

  const apps: ClientSurfaceApp[] = [];
  if (flags.spatialWalkthrough) apps.push("spatial-walkthrough");
  if (flags.siteWalk) apps.push("site-walk");
  if (flags.twin360) apps.push("twin360");
  if (flags.slatedrop) apps.push("slatedrop");
  if (flags.designStudio) apps.push("design-studio");
  if (flags.contentStudio) apps.push("content-studio");
  if (flags.thermal) apps.push("thermal");
  return apps;
}

export function isSpatialOnlyPortal(flags: ClientSurfaceFlags): boolean {
  if (flags.isCeo) return false;
  const apps = visibleClientApps(flags);
  return apps.length === 1 && apps[0] === "spatial-walkthrough";
}

export function projectTabIdsForSurface(flags: ClientSurfaceFlags): string[] {
  const apps = visibleClientApps(flags);
  const tabs = ["overview"];
  if (apps.includes("spatial-walkthrough")) tabs.push("walkthroughs");
  if (apps.includes("site-walk")) {
    tabs.push("walks", "plans");
  }
  if (apps.includes("twin360")) tabs.push("twins");
  if (apps.includes("spatial-walkthrough") || apps.includes("slatedrop") || apps.includes("site-walk")) {
    tabs.push("files");
  }
  if (apps.includes("site-walk")) tabs.push("deliverables");
  tabs.push("team");
  return unique(tabs);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
