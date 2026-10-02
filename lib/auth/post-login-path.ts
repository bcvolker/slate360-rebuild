/**
 * Post-login destination.
 *
 * CEO identity matches `canAccessOperationsConsole`: `isSlateCeo` /
 * `isOwnerEmail()` / `CEO_EMAIL`. This module stays free of `server-only`
 * so middleware (Edge) and unit tests can share the same decision.
 *
 * Non-CEO accounts keep the existing home (`/app`). Desktop middleware then
 * device-forks `/app` → `/dashboard`. The CEO home is `/operations-console`,
 * which that fork does not touch, so the landing sticks.
 */

export const DEFAULT_POST_LOGIN_PATH = "/app";
export const CEO_POST_LOGIN_PATH = "/operations-console";

/** Paths the middleware device fork rewrites. CEO landing must not be one of these. */
export const DEVICE_FORK_PATHS = ["/app", "/dashboard"] as const;

export function isSafeInternalPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("://") && !url.includes("\\");
}

function pathOnly(url: string): string {
  const query = url.indexOf("?");
  const hash = url.indexOf("#");
  let end = url.length;
  if (query >= 0) end = Math.min(end, query);
  if (hash >= 0) end = Math.min(end, hash);
  return url.slice(0, end);
}

/** True for a missing path or the generic app home. Deep links are not the default. */
export function isDefaultAppHome(url: string | null | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return pathOnly(trimmed) === DEFAULT_POST_LOGIN_PATH;
}

/**
 * Same comparison as `isOwnerEmail` in `lib/server/beta-access.ts`.
 * Returns false when the email or `CEO_EMAIL` is missing — never a hardcoded fallback.
 */
export function matchesOwnerEmail(
  email: string | undefined | null,
  ownerEmail: string | undefined | null = process.env.CEO_EMAIL,
): boolean {
  if (!email || !ownerEmail) return false;
  return email.toLowerCase() === ownerEmail.toLowerCase();
}

/**
 * Where a just-authenticated user should land.
 *
 * Explicit safe deep links are honored for every account. The default home
 * (`/app`, or no `redirectTo` / `next`) forks: CEO → operations console,
 * everyone else → `/app`.
 */
export function resolvePostLoginPath(opts: {
  isCeo: boolean;
  requestedPath?: string | null;
}): string {
  const requested = opts.requestedPath?.trim() ?? "";
  const safe = requested && isSafeInternalPath(requested) ? requested : "";
  if (safe && !isDefaultAppHome(safe)) {
    return safe;
  }
  return opts.isCeo ? CEO_POST_LOGIN_PATH : DEFAULT_POST_LOGIN_PATH;
}

/**
 * Mirrors the middleware `/app` ↔ `/dashboard` user-agent fork.
 * Used to prove the CEO landing is not rewritten.
 */
export function applyDeviceFork(pathname: string, isMobile: boolean): string {
  if (pathname === "/dashboard" && isMobile) return "/app";
  if (pathname === "/app" && !isMobile) return "/dashboard";
  return pathname;
}
