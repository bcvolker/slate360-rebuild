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
  if (pathname.startsWith("/digital-twins") || pathname.startsWith("/digital-twin/")) {
    return "twin360";
  }
  if (pathname.startsWith("/site-walks") || pathname.startsWith("/site-walk/")) {
    return "site-walk";
  }
  // Project sub-routes scoped to an app inherit that app's accent.
  if (/^\/projects\/[^/]+\/(twins|digital-twin)/.test(pathname)) return "twin360";
  if (/^\/projects\/[^/]+\/walks/.test(pathname)) return "site-walk";
  return "dashboard";
}
