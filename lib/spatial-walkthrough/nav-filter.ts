export function isNavAppVisible(
  requiresApp: string | undefined,
  isCeo: boolean,
  visibleApps: string[] | null | undefined,
): boolean {
  if (!requiresApp) return true;
  if (isCeo) return true;
  if (!visibleApps) return false;
  return visibleApps.includes(requiresApp);
}

export function isSpatialOnlyAppList(visibleApps: string[] | null | undefined, isCeo: boolean): boolean {
  if (isCeo || !visibleApps) return false;
  return visibleApps.length === 1 && visibleApps[0] === "spatial-walkthrough";
}
