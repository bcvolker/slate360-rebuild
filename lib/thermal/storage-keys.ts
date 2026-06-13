import "server-only";

import { buildS3Key } from "@/lib/s3";

export function buildThermalRawKey(
  orgId: string,
  sessionId: string,
  captureId: string,
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return buildS3Key(orgId, `thermal/${sessionId}/raw/${captureId}`, safe);
}

export function buildThermalProcessedBase(
  orgId: string,
  sessionId: string,
  captureId: string,
): string {
  return `orgs/${orgId}/thermal/${sessionId}/processed/${captureId}`;
}

export function buildThermalNpzKey(orgId: string, sessionId: string, captureId: string): string {
  return `${buildThermalProcessedBase(orgId, sessionId, captureId)}/radiometric.npz`;
}

export function buildThermalPreviewKey(orgId: string, sessionId: string, captureId: string): string {
  return `${buildThermalProcessedBase(orgId, sessionId, captureId)}/false_color.jpg`;
}

export function buildThermalQualityKey(orgId: string, sessionId: string, captureId: string): string {
  return `${buildThermalProcessedBase(orgId, sessionId, captureId)}/quality.json`;
}
