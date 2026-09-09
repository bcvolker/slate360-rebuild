import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BUCKET, s3 } from "@/lib/s3";
import {
  isBundleAsset,
  pickPosterKey,
  summarizeCapture,
  type CaptureBundleLike,
  type SummaryAssetRow,
  type TwinCaptureSummary,
} from "@/lib/twin/capture-summary-pure";

type AdminClient = SupabaseClient;

type AssetRow = SummaryAssetRow & { id: string };

/**
 * Write the capture receipt once every upload has settled, and give the twin a
 * poster if it has none yet. Called from markCaptureUploadedIfReady; every
 * failure here is logged and swallowed — the upload itself already succeeded
 * and must report so.
 *
 * Storage (all additive, no migration):
 * - digital_twin_captures.capture_metadata.summary  — TwinCaptureSummary
 * - digital_twin_captures.asset_counts               — { kind: count }
 * - digital_twin_spaces.settings.poster              — { assetId, captureId, setAt }
 */
export async function recordCaptureSummary(
  admin: AdminClient,
  captureId: string,
  orgId: string,
): Promise<TwinCaptureSummary | null> {
  try {
    const { data: capture } = await admin
      .from("digital_twin_captures")
      .select("id, space_id, capture_metadata")
      .eq("id", captureId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!capture) return null;

    const { data: rows, error } = await admin
      .from("digital_twin_capture_assets")
      .select("id, asset_kind, file_size_bytes, storage_key, status")
      .eq("capture_id", captureId)
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const assets = (rows ?? []) as AssetRow[];

    const bundleRow = assets.find((a) => a.status === "ready" && isBundleAsset(a));
    const bundle = bundleRow?.storage_key ? await readBundle(bundleRow.storage_key) : null;
    const summary = summarizeCapture(assets, bundle);

    const existing =
      capture.capture_metadata && typeof capture.capture_metadata === "object"
        ? (capture.capture_metadata as Record<string, unknown>)
        : {};
    const { error: writeError } = await admin
      .from("digital_twin_captures")
      .update({
        capture_metadata: { ...existing, summary },
        asset_counts: summary.assetKinds,
        has_lidar: summary.lidarPoints > 0,
      })
      .eq("id", captureId)
      .eq("org_id", orgId);
    if (writeError) throw new Error(writeError.message);

    if (capture.space_id) {
      await ensurePoster(admin, orgId, capture.space_id as string, captureId, assets);
    }
    return summary;
  } catch (err) {
    console.error("[twin/capture-summary] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function readBundle(storageKey: string): Promise<CaptureBundleLike | null> {
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    const text = await object.Body?.transformToString("utf8");
    if (!text) return null;
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as CaptureBundleLike) : null;
  } catch (err) {
    console.warn("[twin/capture-summary] bundle unreadable:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * The newest capture's photo becomes the poster. A twin keeps its poster once it
 * has one from a *later* capture; an earlier capture finishing its upload late
 * must not replace it with older imagery.
 */
async function ensurePoster(
  admin: AdminClient,
  orgId: string,
  spaceId: string,
  captureId: string,
  assets: readonly AssetRow[],
): Promise<void> {
  const photos = assets.filter(
    (a) => a.status === "ready" && a.storage_key && (a.asset_kind === "photo" || a.asset_kind === "drone_photo"),
  );
  const key = pickPosterKey(photos.map((a) => a.storage_key as string));
  if (!key) return;
  const asset = photos.find((a) => a.storage_key === key);
  if (!asset) return;

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, settings")
    .eq("id", spaceId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!space) return;
  const settings =
    space.settings && typeof space.settings === "object" ? (space.settings as Record<string, unknown>) : {};
  const current = settings.poster as { captureId?: string; setAt?: string } | undefined;
  if (current?.captureId && current.captureId !== captureId) {
    const { data: other } = await admin
      .from("digital_twin_captures")
      .select("created_at")
      .eq("id", current.captureId)
      .maybeSingle();
    const { data: mine } = await admin
      .from("digital_twin_captures")
      .select("created_at")
      .eq("id", captureId)
      .maybeSingle();
    if (other?.created_at && mine?.created_at && other.created_at > mine.created_at) return;
  }

  await admin
    .from("digital_twin_spaces")
    .update({
      settings: { ...settings, poster: { assetId: asset.id, captureId, setAt: new Date().toISOString() } },
    })
    .eq("id", spaceId)
    .eq("org_id", orgId);
}

/** The poster asset recorded on a space, or null. */
export function readPosterRef(settings: unknown): { assetId: string; captureId: string } | null {
  if (!settings || typeof settings !== "object") return null;
  const poster = (settings as { poster?: unknown }).poster;
  if (!poster || typeof poster !== "object") return null;
  const p = poster as { assetId?: unknown; captureId?: unknown };
  return typeof p.assetId === "string" && typeof p.captureId === "string"
    ? { assetId: p.assetId, captureId: p.captureId }
    : null;
}
