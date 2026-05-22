/**
 * Mobile route quarantine — shared between middleware and client surfaces.
 *
 * Platform shell bottom nav (Projects, SlateDrop, Coordination, Account) uses
 * real routes on mobile. Legacy desktop-only surfaces stay quarantined here.
 */

/** Legacy modules still redirected away from mobile (not platform shell nav). */
export type MobileBlockedModule = "my-work" | "account";

/** Desktop-first routes: redirect mobile users to /app (no Coming Soon sheets). */
export const MOBILE_LEGACY_DESKTOP_PREFIXES: ReadonlyArray<{
  prefix: string;
  blocked: MobileBlockedModule;
}> = [
  { prefix: "/my-work", blocked: "my-work" },
  { prefix: "/my-account", blocked: "account" },
];

/** Site Walk legacy sub-routes (no V1 shell): redirect mobile users to /site-walk home */
export const MOBILE_SITE_WALK_LEGACY_PREFIXES = [
  "/site-walk/deliverables",
  "/site-walk/reports",
  "/site-walk/slatedrop",
  "/site-walk/more",
  "/site-walk/plans",
] as const;

/**
 * Capture V2 task routes — intentionally NOT quarantined on mobile.
 * Includes /site-walk/capture-v2 and /site-walk/capture-v2/summary.
 */
export const MOBILE_SITE_WALK_CAPTURE_V2_PREFIX = "/site-walk/capture-v2" as const;

export const MOBILE_BLOCKED_LABELS: Record<MobileBlockedModule, string> = {
  "my-work": "My Work",
  account: "Account",
};

export const MOBILE_BLOCKED_DESCRIPTIONS: Record<MobileBlockedModule, string> = {
  "my-work": "My Work is not available on mobile yet. Use Site Walk for assigned field work.",
  account: "This legacy account page is unavailable on mobile. Use Account Hub from the bottom nav.",
};

export function resolveMobileLegacyRedirect(pathname: string): string | null {
  for (const { prefix, blocked } of MOBILE_LEGACY_DESKTOP_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return `/app?blocked=${blocked}`;
    }
  }

  for (const prefix of MOBILE_SITE_WALK_LEGACY_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return "/site-walk";
    }
  }

  return null;
}

/** Command palette item ids hidden on mobile (legacy routes only). */
export const MOBILE_DISABLED_COMMAND_IDS = new Set<string>([]);
