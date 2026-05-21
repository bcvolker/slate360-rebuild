/**
 * Mobile route quarantine — shared between middleware and client surfaces.
 *
 * Desktop users keep legacy routes until replacement UIs ship.
 * Mobile/PWA users are redirected away from old desktop-first pages.
 */

/** Query param values for /app?blocked= — must match MOBILE_BLOCKED_LABELS keys */
export type MobileBlockedModule =
  | "projects"
  | "slatedrop"
  | "settings"
  | "my-work"
  | "coordination"
  | "account";

/** Desktop-first routes: redirect mobile users to /app with ?blocked= */
export const MOBILE_LEGACY_DESKTOP_PREFIXES: ReadonlyArray<{
  prefix: string;
  blocked: MobileBlockedModule;
}> = [
  { prefix: "/projects", blocked: "projects" },
  { prefix: "/project-hub", blocked: "projects" },
  { prefix: "/slatedrop", blocked: "slatedrop" },
  { prefix: "/settings", blocked: "settings" },
  { prefix: "/my-work", blocked: "my-work" },
  { prefix: "/coordination", blocked: "coordination" },
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

export const MOBILE_BLOCKED_LABELS: Record<MobileBlockedModule, string> = {
  projects: "Projects",
  slatedrop: "SlateDrop",
  settings: "Settings",
  "my-work": "My Work",
  coordination: "Coordination",
  account: "Account",
};

export const MOBILE_BLOCKED_DESCRIPTIONS: Record<MobileBlockedModule, string> = {
  projects:
    "Project and Project Hub workspaces are desktop-only during the mobile app rollout. Use Site Walk for field capture on mobile.",
  slatedrop:
    "SlateDrop file browsing is desktop-only for now. Site Walk captures and files stay available inside Site Walk.",
  settings:
    "Full account settings are on desktop. Use Account Hub under the Account tab on mobile.",
  "my-work": "My Work is desktop-only during the mobile rollout.",
  coordination:
    "Coordination inbox and calendar are desktop-only for now. Check Account Hub notifications on mobile.",
  account: "This account page is desktop-only. Use Account Hub from the bottom nav on mobile.",
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

/** Command palette item ids hidden on mobile (desktop routes quarantined). */
export const MOBILE_DISABLED_COMMAND_IDS = new Set([
  "nav-projects",
  "nav-slatedrop",
  "acc-settings",
  "new-project",
]);
