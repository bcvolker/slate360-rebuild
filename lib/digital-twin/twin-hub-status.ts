/** Hub list status chip — shared by Twin 360 home dock and My Twins list. */

export type TwinHubStatusChip = "PROCESSING" | "READY" | "FAILED" | "DRAFT";

export function resolveTwinHubStatusChip(
  spaceStatus: string,
  latestJobStatus?: string | null,
): TwinHubStatusChip {
  if (latestJobStatus === "failed") return "FAILED";
  if (spaceStatus === "ready") return "READY";
  if (latestJobStatus === "queued" || latestJobStatus === "processing") return "PROCESSING";
  if (spaceStatus === "processing") return "PROCESSING";
  // A draft/capturing space with NO live job is not processing anything — calling
  // it "PROCESSING" forever is the lie that hid Brian's real models behind an
  // empty duplicate space (LISTING-FIX, 2026-08-07).
  if (spaceStatus === "draft" || spaceStatus === "capturing") return "DRAFT";
  return "PROCESSING";
}

export function twinHubStatusMetaTone(
  chip: TwinHubStatusChip,
): "neutral" | "primary" | "info" {
  if (chip === "READY") return "primary";
  if (chip === "FAILED" || chip === "DRAFT") return "neutral";
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
  if (normalized === "draft") return chip === "DRAFT";
  return true;
}
