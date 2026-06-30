import type { ShellApp } from "@/components/shell/shell-tokens";

/**
 * Pure pathname → active-shell-app resolver (unified shell, Phase 3).
 * Deterministic by URL only — NO referrer/cookie/history inheritance, so a cold deep-link,
 * refresh, or ⌘K jump always resolves the same accent (QA + screenshot stable). Shared
 * surfaces (/slatedrop, /projects, /contacts, /calendar, /deliverables) resolve to
 * "dashboard" (platform), not the app you came from. Drives `data-app` → `--app-accent`.
 * See docs/design/SLATE360_UNIFIED_SHELL.md.
 */
export function resolveShellApp(pathname: string): ShellApp {
  // Exact-or-boundary match so sibling-prefix routes (e.g. a future /site-walks-archive) don't
  // silently inherit the wrong accent — startsWith("/site-walks") alone would match it.
  const inApp = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  if (inApp("/digital-twins") || pathname.startsWith("/digital-twin/")) {
    return "twin360";
  }
  if (inApp("/site-walks") || pathname.startsWith("/site-walk/")) {
    return "site-walk";
  }
  // Project sub-routes scoped to an app inherit that app's accent.
  if (/^\/projects\/[^/]+\/(twins|digital-twin)/.test(pathname)) return "twin360";
  if (/^\/projects\/[^/]+\/walks/.test(pathname)) return "site-walk";
  return "dashboard";
}
