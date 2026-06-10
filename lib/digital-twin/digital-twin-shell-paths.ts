/** Digital Twin shell routing helpers — mirror Site Walk shell path policy. */

export const DIGITAL_TWIN_MOBILE_ROUTE = "digital-twin" as const;

/** Module home uses (mobile)/MobilePlatformShell; sub-routes full-bleed via StudioAppShell. */
export function isDigitalTwinPlatformBypassPath(pathname: string): boolean {
  if (pathname === "/digital-twin") return false;
  return pathname.startsWith("/digital-twin/");
}

/** Active capture routes — full-bleed task overlay (camera, review), no sub-route chrome. */
export function isDigitalTwinCapturePath(pathname: string): boolean {
  return pathname.startsWith("/digital-twin/capture");
}

/** Task surfaces that render without sub-route header chrome. */
export function isDigitalTwinPassthroughShellPath(pathname: string): boolean {
  return isDigitalTwinCapturePath(pathname);
}
