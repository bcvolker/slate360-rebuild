/**
 * Canonical Capture V2 route paths — used by shell fullBleed checks and navigation.
 */

export const SITE_WALK_CAPTURE_V2_BASE = "/site-walk/capture-v2" as const;

export const SITE_WALK_CAPTURE_V2_ROUTES = {
  capture: SITE_WALK_CAPTURE_V2_BASE,
  summary: `${SITE_WALK_CAPTURE_V2_BASE}/summary`,
} as const;

/** Returns true when pathname should render in platform full-bleed task mode. */
export function isSiteWalkCaptureV2Path(pathname: string): boolean {
  if (pathname === SITE_WALK_CAPTURE_V2_ROUTES.capture) return true;
  if (pathname.startsWith(`${SITE_WALK_CAPTURE_V2_ROUTES.capture}/`)) return true;
  if (pathname === SITE_WALK_CAPTURE_V2_ROUTES.summary) return true;
  if (pathname.startsWith(`${SITE_WALK_CAPTURE_V2_ROUTES.summary}/`)) return true;
  return false;
}
