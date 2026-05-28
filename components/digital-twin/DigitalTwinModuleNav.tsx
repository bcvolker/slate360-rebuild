"use client";

export function resolveDigitalTwinRouteTitle(pathname: string): string {
  if (pathname.startsWith("/digital-twin/capture")) return "Quick Capture";
  if (pathname.startsWith("/digital-twin/upload")) return "Upload";
  if (pathname.startsWith("/digital-twin/twins")) return "My Twins";
  return "Digital Twin";
}

/** @deprecated Use MobilePlatformHeader via DigitalTwinShell. Kept for title resolver compatibility. */
export function DigitalTwinSubRouteHeader() {
  return null;
}
