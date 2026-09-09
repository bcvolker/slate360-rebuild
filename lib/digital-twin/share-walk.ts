import "server-only";

import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import { BUCKET, s3 } from "@/lib/s3";
import { parseTwinWalkSidecar, type TwinWalkSidecar } from "@/lib/digital-twin/share-walk-types";

/**
 * Read the `<key>.walk.json` sidecar that sits beside a published `.spz`.
 * Null when absent or malformed — the share page then falls back to the orbit
 * viewer, exactly as before sidecars existed.
 */
/** True when the studio published a metric LiDAR mesh (`<key>.geometry.glb`) beside the .spz. */
export async function hasTwinGeometry(storageKey: string): Promise<boolean> {
  if (!storageKey.toLowerCase().endsWith(".spz")) return false;
  const key = `${storageKey.slice(0, -".spz".length)}.geometry.glb`;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function readTwinWalkSidecar(storageKey: string): Promise<TwinWalkSidecar | null> {
  if (!storageKey.toLowerCase().endsWith(".spz")) return null;
  const key = `${storageKey.slice(0, -".spz".length)}.walk.json`;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body?.transformToString();
    if (!body) return null;
    return parseTwinWalkSidecar(JSON.parse(body));
  } catch {
    return null;
  }
}
