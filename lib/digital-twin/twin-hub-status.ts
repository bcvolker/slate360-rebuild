/** Hub list status chip — shared by Twin 360 home dock and My Twins list. */

export type TwinHubStatusChip = "PROCESSING" | "READY" | "FAILED";

export function resolveTwinHubStatusChip(
  spaceStatus: string,
  latestJobStatus?: string | null,
): TwinHubStatusChip {
  if (latestJobStatus === "failed") return "FAILED";
  if (spaceStatus === "ready") return "READY";
  if (
    spaceStatus === "processing" ||
    spaceStatus === "capturing" ||
    spaceStatus === "draft" ||
    latestJobStatus === "queued" ||
    latestJobStatus === "processing"
  ) {
    return "PROCESSING";
  }
  return "PROCESSING";
}

export function twinHubStatusMetaTone(
  chip: TwinHubStatusChip,
): "neutral" | "primary" | "info" {
  if (chip === "READY") return "primary";
  if (chip === "FAILED") return "neutral";
  return "info";
}

export function matchesTwinStatusFilter(
  chip: TwinHubStatusChip,
  filter: string | undefined,
): boolean {
  if (!filter) return true;
  const normalized = filter.toLowerCase();
  if (normalized === "processing") return chip === "PROCESSING";
  if (normalized === "ready") return chip === "READY";
  if (normalized === "failed") return chip === "FAILED";
  return true;
}
