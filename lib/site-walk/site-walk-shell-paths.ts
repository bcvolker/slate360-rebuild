import { isSiteWalkCaptureV2Path } from "@/lib/site-walk/capture-v2-routes";

/** Active capture routes (V1 + V2) — use task overlay shell, not subpage chrome. */
export function isSiteWalkCapturePath(pathname: string): boolean {
  return pathname.startsWith("/site-walk/capture") || isSiteWalkCaptureV2Path(pathname);
}

/** Full-bleed Site Walk surfaces (no platform AppShell sidebar / bottom nav). */
export function isSiteWalkFullBleedPath(pathname: string): boolean {
  return pathname === "/site-walk" || pathname.startsWith("/site-walk/");
}

/**
 * Routes that render their own viewport chrome (capture overlay, walk review).
 * SiteWalkRouteShell passes children through without subpage header.
 */
export function isSiteWalkPassthroughShellPath(pathname: string): boolean {
  if (isSiteWalkCapturePath(pathname)) return true;
  if (/^\/site-walk\/walks\/[^/]+$/.test(pathname)) return true;
  return false;
}
