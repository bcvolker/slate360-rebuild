/**
 * Phase 1 presentation cutover.
 * Owner means `canAccessOperationsConsole` (the CEO email helper). No second owner list.
 * `/app` stays the field shell on every device. It is not the default home.
 * Mobile login does not assume the person is capturing. A missing deep link uses the persona home.
 */

export const CLIENT_HOME = "/vnext/projects";
export const OWNER_HOME = "/vnext/ops";
export const CLIENT_ACCOUNT = "/vnext/account";
export const OWNER_ACCOUNT = "/vnext/ops/account";
/** Authenticated landing that middleware splits by persona. */
export const POST_AUTH_RESOLVER = "/vnext/home";

export type CutoverTarget = { pathname: string; search: string };

const RESERVED_PROJECT_IDS = new Set(["new"]);

export function canonicalProductHome(canAccessOperationsConsole: boolean): string {
  return canAccessOperationsConsole ? OWNER_HOME : CLIENT_HOME;
}

export function canonicalAccountHome(canAccessOperationsConsole: boolean): string {
  return canAccessOperationsConsole ? OWNER_ACCOUNT : CLIENT_ACCOUNT;
}

const SAFE_INTERNAL_PATH_ORIGIN = "http://internal.invalid";

export function safeInternalPath(raw: string | null | undefined): CutoverTarget | null {
  if (!raw) return null;
  // Reject any C0 control character (tab, LF, CR, ...) or DEL anywhere in the string, not just
  // leading. Browsers strip ASCII tab/newline/CR per the WHATWG URL spec wherever they occur, so
  // a string that looks like a safe same-origin path here — e.g. "/\t/evil.com" — can be
  // reparsed downstream (a raw Location header, window.location =, an unguarded `new URL(...)`
  // call) as "//evil.com", a protocol-relative open redirect. Stripping the characters and
  // continuing would just recreate that exact hole, so any control character is an outright
  // rejection, not a sanitize-and-continue.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(raw)) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw, SAFE_INTERNAL_PATH_ORIGIN);
  } catch {
    return null;
  }
  // Parsing against a fixed local origin means any payload that resolves to a different
  // origin — scheme-relative, backslash tricks the browser normalizes, anything the checks
  // above missed — fails here instead of silently producing an off-site target.
  if (url.origin !== SAFE_INTERNAL_PATH_ORIGIN) return null;
  const pathname = normalizePath(url.pathname);
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  return { pathname, search: url.search };
}

export function resolveLegacyProjectRedirect(pathname: string, search: string): CutoverTarget | null {
  const path = normalizePath(pathname);
  if (path === "/projects") return { pathname: CLIENT_HOME, search };
  const match = path.match(/^\/projects\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1] ?? "");
  if (RESERVED_PROJECT_IDS.has(id)) return null;
  const rest = match[2] ?? "";
  const base = `${CLIENT_HOME}/${match[1]}`;
  if (rest === "") return { pathname: base, search };
  if (rest === "/slatedrop" || rest.startsWith("/slatedrop/")) {
    return { pathname: `${base}/documents`, search };
  }
  if (rest === "/twins" || rest.startsWith("/twins/")) {
    return exploreTarget(base, search, rest, "/twins/", "reality");
  }
  if (rest === "/walks" || rest.startsWith("/walks/")) {
    const session = firstSegment(rest, "/walks/");
    return { pathname: session ? `${base}/history/${session}` : `${base}/history`, search };
  }
  if (rest === "/punch-list" || rest.startsWith("/punch-list/")) {
    return { pathname: `${base}/items`, search };
  }
  if (rest === "/plans" || rest.startsWith("/plans/")) {
    const sheet = firstSegment(rest, "/plans/");
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const sheetId = sheet || params.get("sheet") || params.get("planId") || "";
    if (!sheetId) return { pathname: `${base}/documents`, search };
    if (!params.get("source")) params.set("source", sheetId);
    params.set("rep", "plan");
    params.delete("sheet");
    params.delete("planId");
    return { pathname: `${base}/explore`, search: searchOf(params) };
  }
  return null;
}

export function resolvePhase1Cutover(input: {
  pathname: string;
  search: string;
  redirectTo: string | null;
  hasUser: boolean;
  canAccessOperationsConsole: boolean;
  isMobile: boolean;
  isStandaloneOnly: boolean;
  /**
   * Org-scoped staff (operations/field, via organization_members membership — the same signal
   * middleware already fetches for the walled-garden check) or the native app wrapper. These are
   * not client-portal visitors: the legacy /projects* operational UI (SlateDrop, Twin/Reality
   * capture links, Walks, plan sheets, punch list) is their real workspace, so it must stay
   * reachable rather than being rewritten to the read-only vNext client experience. Defaults to
   * false so every existing (client) call site is unaffected.
   */
  isInternalUser?: boolean;
}): CutoverTarget | null {
  const path = normalizePath(input.pathname);
  const search = input.search.startsWith("?") || input.search === "" ? input.search : `?${input.search}`;

  if (input.hasUser && (path === "/login" || path === "/signup")) {
    const deep = safeInternalPath(input.redirectTo);
    if (deep && deep.pathname !== "/login" && deep.pathname !== "/signup") {
      if (deep.pathname === POST_AUTH_RESOLVER) {
        return homeTarget(input.canAccessOperationsConsole);
      }
      if (input.isInternalUser) return deep;
      return resolveLegacyProjectRedirect(deep.pathname, deep.search) ?? deep;
    }
    return homeTarget(input.canAccessOperationsConsole);
  }

  if (path === "/ceo" || path === "/operations-console") {
    return { pathname: OWNER_HOME, search: path === "/operations-console" ? search : "" };
  }

  if (!input.isInternalUser) {
    const project = resolveLegacyProjectRedirect(path, search);
    if (project) return sameTarget(path, search, project);
  }

  if (!input.hasUser) return null;

  if (path === POST_AUTH_RESOLVER) return homeTarget(input.canAccessOperationsConsole);

  if (path === "/dashboard") {
    if (input.isStandaloneOnly) return { pathname: "/app", search: "" };
    return { pathname: canonicalProductHome(input.canAccessOperationsConsole), search };
  }

  if (!input.isMobile && path === "/my-account") {
    return { pathname: canonicalAccountHome(input.canAccessOperationsConsole), search };
  }

  return null;
}

/** Default after login when no deep link was requested. Billing paths are not a home. */
export function postAuthDestination(raw: string | null | undefined): string {
  const safe = safeInternalPath(raw);
  if (!safe) return POST_AUTH_RESOLVER;
  const billing = ["/plans", "/billing", "/upgrade", "/subscription", "/seats"];
  if (billing.some((prefix) => safe.pathname === prefix || safe.pathname.startsWith(`${prefix}/`))) {
    return POST_AUTH_RESOLVER;
  }
  const legacy = resolveLegacyProjectRedirect(safe.pathname, safe.search);
  if (legacy) return `${legacy.pathname}${legacy.search}`;
  return `${safe.pathname}${safe.search}`;
}

function homeTarget(canAccessOperationsConsole: boolean): CutoverTarget {
  return { pathname: canonicalProductHome(canAccessOperationsConsole), search: "" };
}

function sameTarget(path: string, search: string, target: CutoverTarget): CutoverTarget | null {
  if (target.pathname === path && target.search === search) return null;
  return target;
}

function exploreTarget(
  base: string,
  search: string,
  rest: string,
  prefix: string,
  rep: string,
): CutoverTarget {
  const id = firstSegment(rest, prefix);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (id && !params.get("source")) params.set("source", id);
  if (!params.get("rep")) params.set("rep", rep);
  return { pathname: `${base}/explore`, search: searchOf(params) };
}

function firstSegment(rest: string, prefix: string): string {
  if (!rest.startsWith(prefix)) return "";
  return rest.slice(prefix.length).split("/").filter(Boolean)[0] ?? "";
}

function searchOf(params: URLSearchParams): string {
  const value = params.toString();
  return value ? `?${value}` : "";
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}
