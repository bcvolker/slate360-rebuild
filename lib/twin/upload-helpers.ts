import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildS3Key } from "@/lib/s3";
import { TWIN_MULTIPART_PART_BYTES } from "@/lib/twin/upload-constants";

type AdminClient = SupabaseClient;

export { TWIN_MULTIPART_PART_BYTES, TWIN_SINGLE_UPLOAD_MAX_BYTES } from "@/lib/twin/upload-constants";

export type TwinFileDescriptor = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  assetKind?: string;
  /** P0a — stable client identity so re-submits reuse the asset row instead of duplicating it. */
  clientFingerprint?: string;
};

export type TwinGpsFix = {
  lat: number;
  lng: number;
  alt?: number;
  accuracy?: number;
};

export function buildTwinStorageKey(
  orgId: string,
  spaceId: string,
  captureId: string,
  filename: string,
): string {
  return buildS3Key(orgId, `digital-twin/${spaceId}/${captureId}`, filename);
}

export function inferTwinAssetKind(
  contentType: string,
  filename: string,
  explicit?: string,
): string {
  if (explicit) return explicit;

  const mime = contentType.toLowerCase();
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  // Insta360 RAW containers are dual-fisheye media even when browsers report
  // them as generic video/octet-stream. This must run before the generic
  // video branch or the worker will receive is360=false.
  if (ext === "insv" || ext === "insp") return "panorama_360";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("ply") || ["ply", "las", "laz", "e57", "pcd", "xyz", "pts"].includes(ext)) {
    return "ply_lidar";
  }
  if (["obj", "glb", "gltf", "fbx", "stl"].includes(ext)) return "lidar_mesh";
  if (mime.includes("kml") || ext === "kml") return "geospatial_kml";
  if (mime.includes("gpx") || ext === "gpx") return "geospatial_gpx";
  if (mime.includes("geojson") || ext === "geojson") return "geospatial_geojson";
  if (mime.includes("panorama")) return "panorama_360";
  if (mime.startsWith("image/")) return "photo";
  if (ext === "s360depth") return "lidar_depth";
  const lower = filename.toLowerCase();
  // High-rate ARKit trajectory master (filename: lidar_traj.jsonl[.gz])
  if (lower.includes("traj") && (lower.includes(".jsonl") || ext === "jsonl")) return "lidar_traj";
  // ARKit pose JSON exported by the LiDAR plugin (filename: lidar_poses.json)
  if (ext === "json" && lower.includes("poses")) return "lidar_poses";
  return "other";
}

export function isExternalTwinLidarScanFilename(filename: string): boolean {
  return /\.(las|laz|e57)$/i.test(filename);
}

export async function resolveTwinSpace(
  admin: AdminClient,
  orgId: string,
  spaceId: string,
  projectId: string,
) {
  const { data, error } = await admin
    .from("digital_twin_spaces")
    .select("id, org_id, project_id, title")
    .eq("id", spaceId)
    .eq("org_id", orgId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Twin space not found for project");
  return data;
}

export async function applyCaptureGpsMetadata(
  admin: AdminClient,
  captureId: string,
  orgId: string,
  gps: TwinGpsFix | null | undefined,
): Promise<void> {
  if (!gps || typeof gps.lat !== "number" || typeof gps.lng !== "number") return;

  const { data: capture, error: readError } = await admin
    .from("digital_twin_captures")
    .select("capture_metadata")
    .eq("id", captureId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!capture) return;

  const existing =
    capture.capture_metadata && typeof capture.capture_metadata === "object"
      ? (capture.capture_metadata as Record<string, unknown>)
      : {};

  const { error } = await admin
    .from("digital_twin_captures")
    .update({
      capture_metadata: {
        ...existing,
        gps: {
          lat: gps.lat,
          lng: gps.lng,
          ...(typeof gps.alt === "number" ? { alt: gps.alt } : {}),
          ...(typeof gps.accuracy === "number" ? { accuracy: gps.accuracy } : {}),
          capturedAt: new Date().toISOString(),
        },
      },
    })
    .eq("id", captureId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
}

export async function resolveOrCreateCapture(
  admin: AdminClient,
  params: {
    orgId: string;
    spaceId: string;
    projectId: string;
    userId: string;
    captureId?: string | null;
    title?: string | null;
    gps?: TwinGpsFix | null;
  },
) {
  if (params.captureId) {
    const { data, error } = await admin
      .from("digital_twin_captures")
      .select("id, space_id, project_id, capture_status")
      .eq("id", params.captureId)
      .eq("org_id", params.orgId)
      .eq("space_id", params.spaceId)
      .eq("project_id", params.projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Capture not found");
    await applyCaptureGpsMetadata(admin, data.id, params.orgId, params.gps);
    return data;
  }

  const captureMetadata =
    params.gps && typeof params.gps.lat === "number" && typeof params.gps.lng === "number"
      ? {
          gps: {
            lat: params.gps.lat,
            lng: params.gps.lng,
            ...(typeof params.gps.alt === "number" ? { alt: params.gps.alt } : {}),
            ...(typeof params.gps.accuracy === "number" ? { accuracy: params.gps.accuracy } : {}),
            capturedAt: new Date().toISOString(),
          },
        }
      : {};

  const { data, error } = await admin
    .from("digital_twin_captures")
    .insert({
      org_id: params.orgId,
      space_id: params.spaceId,
      project_id: params.projectId,
      created_by: params.userId,
      title: params.title ?? "Upload session",
      capture_status: "draft",
      capture_metadata: captureMetadata,
    })
    .select("id, space_id, project_id, capture_status")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create capture");
  return data;
}

export async function markCaptureUploadedIfReady(
  admin: AdminClient,
  captureId: string,
  orgId: string,
): Promise<void> {
  const { data: pending, error } = await admin
    .from("digital_twin_capture_assets")
    .select("id, status")
    .eq("capture_id", captureId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .neq("status", "archived");

  if (error) throw new Error(error.message);
  if (!pending?.length) return;

  // `failed` is terminal for this pass (the device reported it gave up), so it must not
  // hold the capture in `uploading` forever — the submit funnel proceeds with what
  // landed, and the failed row keeps its error_text. If a background resume later
  // uploads the bytes, finalize/complete flips the row to `ready` and re-runs this
  // check, which also lifts an all-failed capture out of `failed`.
  const allSettled = pending.every((row) => row.status === "ready" || row.status === "failed");
  if (!allSettled) return;
  const anyReady = pending.some((row) => row.status === "ready");

  const { error: captureError } = await admin
    .from("digital_twin_captures")
    .update(
      anyReady
        ? { capture_status: "uploaded", uploaded_at: new Date().toISOString(), error_text: null }
        : { capture_status: "failed", error_text: "All capture uploads failed" },
    )
    .eq("id", captureId)
    .eq("org_id", orgId);

  if (captureError) throw new Error(captureError.message);
}
