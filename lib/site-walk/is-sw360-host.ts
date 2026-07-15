/**
 * Shared client-side check for "is this the SW360 native app" — used
 * wherever a shared/legacy component (like the capture-v2 engine) needs to
 * branch behavior between the legacy Slate360 app and Site Walk 360.
 */
export function isSW360Host(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "app.sitewalk360.app";
}
