export function isNavAppVisible(
  requiresApp: string | undefined,
  isCeo: boolean,
  visibleApps: string[] | null | undefined,
): boolean {
  if (!requiresApp) return true;
  if (isCeo) return true;
  if (!visibleApps) return requiresApp !== "spatial-walkthrough";
  return visibleApps.includes(requiresApp);
}
