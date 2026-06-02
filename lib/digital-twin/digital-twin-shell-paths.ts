/** Digital Twin shell routing helpers — mirror Site Walk shell path policy. */

/** Module home uses (mobile)/MobilePlatformShell; sub-routes full-bleed via StudioAppShell. */
export function isDigitalTwinPlatformBypassPath(pathname: string): boolean {
  if (pathname === "/digital-twin") return false;
  return pathname.startsWith("/digital-twin/");
}

/** Task surfaces that render without sub-route header chrome. */
export function isDigitalTwinPassthroughShellPath(_pathname: string): boolean {
  return false;
}
