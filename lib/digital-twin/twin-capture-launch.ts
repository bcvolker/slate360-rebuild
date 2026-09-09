/** Query-string helpers for Twin 360 capture and upload entry from the module home. */

export type TwinCaptureLaunchMode = "quick" | "project";

export function buildTwinCaptureLaunchUrl(options?: {
  projectId?: string;
  mode?: TwinCaptureLaunchMode;
  /** Capture into this exact twin (created by the New Scan sheet) instead of the project's first space. */
  spaceId?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.projectId) params.set("projectId", options.projectId);
  if (options?.mode) params.set("mode", options.mode);
  if (options?.spaceId) params.set("spaceId", options.spaceId);
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
