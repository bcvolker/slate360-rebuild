/**
 * Mobile route quarantine — shared between middleware and client surfaces.
 *
 * Desktop users keep legacy routes until replacement UIs ship.
 * Mobile/PWA users are redirected away from old desktop-first pages.
 */

export type MobileBlockedModule =
  | "projects"
  | "project-hub"
  | "slatedrop"
  | "settings"
  | "my-work"
  | "coordination"
  | "my-account";

/** Desktop-first routes: redirect mobile users to /app with ?blocked= */
export const MOBILE_LEGACY_DESKTOP_PREFIXES: ReadonlyArray<{
  prefix: string;
  blocked: MobileBlockedModule;
}> = [
  { prefix: "/projects", blocked: "projects" },
  { prefix: "/project-hub", blocked: "project-hub" },
  { prefix: "/slatedrop", blocked: "slatedrop" },
  { prefix: "/settings", blocked: "settings" },
  { prefix: "/my-work", blocked: "my-work" },
  { prefix: "/coordination", blocked: "coordination" },
  { prefix: "/my-account", blocked: "my-account" },
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
  "project-hub": "Project Hub",
  slatedrop: "SlateDrop",
  settings: "Settings",
  "my-work": "My Work",
  coordination: "Coordination",
  "my-account": "Account",
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
