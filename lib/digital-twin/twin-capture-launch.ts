/** Query-string helpers for Twin 360 capture and upload entry from the module home. */

export type TwinCaptureLaunchMode = "quick" | "project";

export function buildTwinCaptureLaunchUrl(options?: {
  projectId?: string;
  mode?: TwinCaptureLaunchMode;
}): string {
  const params = new URLSearchParams();
  if (options?.projectId) params.set("projectId", options.projectId);
  if (options?.mode) params.set("mode", options.mode);
  const query = params.toString();
  return query ? `/digital-twin/capture?${query}` : "/digital-twin/capture";
}

export function buildTwinUploadLaunchUrl(options?: {
  projectId?: string;
  mode?: TwinCaptureLaunchMode;
}): string {
  const params = new URLSearchParams();
  if (options?.projectId) params.set("projectId", options.projectId);
  if (options?.mode) params.set("mode", options.mode);
  const query = params.toString();
  return query ? `/digital-twin/upload?${query}` : "/digital-twin/upload";
}
