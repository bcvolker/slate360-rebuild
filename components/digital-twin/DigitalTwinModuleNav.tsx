"use client";

export function resolveDigitalTwinRouteTitle(pathname: string): string {
  if (pathname.startsWith("/digital-twin/capture")) return "Quick Capture";
  if (pathname.startsWith("/digital-twin/upload")) return "Upload";
  if (pathname.includes("/editor")) return "Splat Editor";
  if (pathname.includes("/cinematic")) return "Cinematic Path";
  if (pathname.includes("/progression")) return "Progression";
  if (pathname.match(/^\/digital-twin\/twins\/[^/]+$/)) return "Twin";
  if (pathname.startsWith("/digital-twin/twins")) return "Projects";
  if (pathname.match(/^\/digital-twin\/projects\/[^/]+$/)) return "Project twins";
  if (pathname.startsWith("/digital-twin/projects")) return "Projects";
  return "Digital Twin";
}

/** @deprecated Use MobilePlatformHeader via DigitalTwinShell. Kept for title resolver compatibility. */
export function DigitalTwinSubRouteHeader() {
  return null;
}
