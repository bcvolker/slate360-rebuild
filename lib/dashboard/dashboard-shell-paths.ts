/**
 * Routes that receive the desktop dashboard sidebar shell.
 * Capture / full-bleed flows stay outside the shell.
 */

const FULL_BLEED_PREFIXES = [
  "/site-walk/capture",
  "/site-walk/capture-v2",
  "/digital-twin/capture",
  "/digital-twin/upload",
];

export function shouldWrapDashboardDesktopShell(pathname: string): boolean {
  if (!pathname || pathname === "/app") return false;

  if (FULL_BLEED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return true;
  if (pathname === "/site-walks" || pathname.startsWith("/site-walks/")) return true;
  if (pathname === "/digital-twins" || pathname.startsWith("/digital-twins/")) return true;
  if (pathname === "/slatedrop" || pathname.startsWith("/slatedrop/")) return true;
  if (pathname === "/more" || pathname.startsWith("/more/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;

  return false;
}
