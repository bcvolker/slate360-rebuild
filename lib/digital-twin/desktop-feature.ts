/** Client-safe flag for Phase 2/3 desktop twin workstation surfaces. */
export function isDigitalTwinDesktopEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DIGITAL_TWIN_DESKTOP === "true";
}
