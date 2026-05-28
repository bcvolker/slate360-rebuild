"use client";

export function resolveSiteWalkRouteTitle(pathname: string): string {
  if (pathname.startsWith("/site-walk/setup")) return "Setup";
  if (pathname.startsWith("/site-walk/walks/") && pathname !== "/site-walk/walks") {
    return "Walk Review";
  }
  if (pathname.startsWith("/site-walk/walks")) return "Walks";
  if (pathname.startsWith("/site-walk/deliverables")) return "Deliverables";
  if (pathname.startsWith("/site-walk/reports")) return "Reports";
  if (pathname.startsWith("/site-walk/assigned-work")) return "Assigned Work";
  if (pathname.startsWith("/site-walk/progression")) return "Progress";
  if (pathname.startsWith("/site-walk/items")) return "Items";
  if (pathname.startsWith("/site-walk/more")) return "More";
  if (pathname.startsWith("/site-walk/slatedrop")) return "SlateDrop";
  if (pathname.startsWith("/site-walk/capture")) return "Capture";
  return "Site Walk";
}

/** @deprecated Use MobilePlatformHeader via SiteWalkShell. Kept for title resolver compatibility. */
export function SiteWalkSubRouteHeader() {
  return null;
}

/** @deprecated Use SiteWalkShell. Kept for import compatibility. */
export function SiteWalkModuleNav() {
  return null;
}
