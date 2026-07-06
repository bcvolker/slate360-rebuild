import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import type { PublicTourSummary, PublicPlanTour, SceneRuntime, SceneTileManifestRuntime } from "@/lib/types/tours";

const SIGN_EXPIRES_SECONDS = 3600;

function sign(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: SIGN_EXPIRES_SECONDS });
}

/**
 * Resolves a published tour by its public slug into signed-URL form — never
 * exposes raw R2 keys to the client. Scene list is thumbnail-only (cheap: one
 * sign per scene); the full tile manifest for a scene is resolved separately
 * by resolvePublicSceneRuntime, called on-demand as the viewer navigates, so
 * a many-scene tour doesn't sign hundreds of unused tile URLs on first load.
 *
 * Thumbnails are plain <img> src values, which don't trigger a CORS-checked
 * read (unlike the WebGL/PSV tile & panorama textures below), so a direct
 * signed R2 URL is fine here.
 */
export async function resolvePublicTourSummary(
  admin: SupabaseClient,
  slug: string,
): Promise<PublicTourSummary | null> {
  const { data: tour } = await admin
    .from("project_tours")
    .select("id, title, description, logo_asset_path, logo_width_percent, logo_opacity, logo_position, plan_set_id")
    .eq("viewer_slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!tour) return null;

  const { data: scenes } = await admin
    .from("tour_scenes")
    .select("id, title, sort_order, thumbnail_path, panorama_path")
    .eq("tour_id", tour.id)
    .order("sort_order", { ascending: true });

  const planTour = tour.plan_set_id ? await resolvePlanTour(admin, tour.id, tour.plan_set_id) : null;

  const sceneSummaries = await Promise.all(
    (scenes ?? []).map(async (s) => {
      const key = s.thumbnail_path ?? s.panorama_path ?? null;
      return {
        id: s.id,
        title: s.title,
        sortOrder: s.sort_order,
        thumbnailUrl: key ? await sign(key) : null,
      };
    }),
  );

  return {
    id: tour.id,
    title: tour.title,
    description: tour.description,
    branding: {
      logoUrl: tour.logo_asset_path ? await sign(tour.logo_asset_path) : null,
      logoPosition: tour.logo_position,
      logoOpacity: tour.logo_opacity,
      logoWidthPercent: tour.logo_width_percent,
    },
    scenes: sceneSummaries,
    planTour,
  };
}

/**
 * Resolves the plan-sheet tour data for a published tour anchored to a plan
 * set — reuses Site Walk's project-scoped rasterized sheets directly (see
 * lib/tours/plan-sheets.ts for the authoring-side equivalent). Sheet images
 * are plain <img> src values (no CORS concern, unlike the WebGL tile/panorama
 * assets), so direct signed URLs are fine here.
 */
async function resolvePlanTour(
  admin: SupabaseClient,
  tourId: string,
  planSetId: string,
): Promise<PublicPlanTour | null> {
  const { data: sheets } = await admin
    .from("site_walk_plan_sheets")
    .select("id, sheet_number, sheet_name, image_s3_key, thumbnail_s3_key, rasterized_key, rasterized_width, rasterized_height, sort_order")
    .eq("plan_set_id", planSetId)
    .order("sort_order", { ascending: true });
  if (!sheets?.length) return null;

  const { data: pins } = await admin
    .from("tour_plan_pins")
    .select("id, plan_sheet_id, scene_id, x_pct, y_pct, pin_number, title")
    .eq("tour_id", tourId)
    .order("sort_order", { ascending: true });

  const sheetSummaries = await Promise.all(
    sheets.map(async (sheet) => {
      const key = sheet.rasterized_key ?? sheet.thumbnail_s3_key ?? sheet.image_s3_key ?? null;
      return {
        id: sheet.id,
        sheetNumber: sheet.sheet_number,
        sheetName: sheet.sheet_name,
        imageUrl: key ? await sign(key) : null,
        width: sheet.rasterized_width ?? 0,
        height: sheet.rasterized_height ?? 0,
      };
    }),
  );

  return {
    sheets: sheetSummaries,
    pins: (pins ?? []).map((p) => ({
      id: p.id,
      sheetId: p.plan_sheet_id,
      sceneId: p.scene_id,
      xPct: Number(p.x_pct),
      yPct: Number(p.y_pct),
      pinNumber: p.pin_number,
      title: p.title,
    })),
  };
}

/**
 * Reads a scene's tiles_manifest.json and returns its grid metadata + PROXY
 * paths (not direct R2 signed URLs) for base/tile images.
 *
 * Why a proxy instead of direct signed URLs: PSV's tiles adapter uploads tile
 * bytes as WebGL textures, which requires a real CORS-permitted fetch() (not
 * just an <img> display load) — verified empirically that our R2 bucket's
 * CORS policy blocks this (a same-URL <img> load succeeds while fetch() fails
 * with no console error, the classic CORS-block signature), and the current
 * R2 API token doesn't have permission to read or write the bucket's CORS
 * policy to fix it at the source. Proxying through our own same-origin route
 * sidesteps the dependency entirely — see app/api/tours/public/[slug]/scenes/
 * [sceneId]/asset/route.ts. If R2 CORS is configured later (2-minute fix via
 * the Cloudflare dashboard), this can switch back to direct signed URLs for
 * better performance (one fewer hop per tile).
 */
async function resolveTileGrid(
  manifestKey: string,
  assetBase: string,
): Promise<SceneTileManifestRuntime | null> {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: manifestKey }));
    const raw = await obj.Body?.transformToString();
    const manifest = raw ? JSON.parse(raw) : null;
    const level = manifest?.levels?.[0];
    if (!level) return null;

    const tileUrls = Array.from({ length: level.rows * level.cols }, (_, i) => {
      const row = Math.floor(i / level.cols);
      const col = i % level.cols;
      return `${assetBase}?variant=tile&col=${col}&row=${row}`;
    });

    return {
      sourceWidth: manifest.sourceWidth,
      sourceHeight: manifest.sourceHeight,
      tileSize: level.tileSize,
      cols: level.cols,
      rows: level.rows,
      baseUrl: `${assetBase}?variant=base`,
      tileUrls,
    };
  } catch (err) {
    console.error("[public-manifest] tiles manifest read failed, falling back to single image:", err);
    return null;
  }
}

/**
 * Full runtime for ONE scene (tiles or fallback image), scoped to a published
 * tour's slug so an unpublished or foreign scene id can't be reached just by
 * guessing an id.
 */
export async function resolvePublicSceneRuntime(
  admin: SupabaseClient,
  slug: string,
  sceneId: string,
): Promise<SceneRuntime | null> {
  const { data: tour } = await admin
    .from("project_tours")
    .select("id")
    .eq("viewer_slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!tour) return null;

  const { data: scene } = await admin
    .from("tour_scenes")
    .select("id, title, sort_order, initial_yaw, initial_pitch, panorama_path, thumbnail_path, multires_manifest_path")
    .eq("id", sceneId)
    .eq("tour_id", tour.id)
    .maybeSingle();
  if (!scene) return null;

  const assetBase = `/api/tours/public/${slug}/scenes/${sceneId}/asset`;
  const tiles = scene.multires_manifest_path
    ? await resolveTileGrid(scene.multires_manifest_path, assetBase)
    : null;
  const fallbackImageUrl = tiles ? null : `${assetBase}?variant=fallback`;

  return {
    id: scene.id,
    title: scene.title,
    sortOrder: scene.sort_order,
    initialYaw: scene.initial_yaw ?? 0,
    initialPitch: scene.initial_pitch ?? 0,
    thumbnailUrl: scene.thumbnail_path ? await sign(scene.thumbnail_path) : null,
    tiles,
    fallbackImageUrl,
  };
}

export type ResolvedAsset = { body: Uint8Array; contentType: string };

/**
 * Resolves the actual bytes for one WebGL-consumed asset (base/tile/fallback)
 * of a published scene — backs the same-origin asset-proxy route. Re-derives
 * the manifest/prefix from scratch per call rather than caching; each read is
 * a small/cheap R2 GET (manifest.json) plus the one requested object, and R2
 * has no egress cost, so the simplicity is worth the minor redundancy.
 */
export async function resolvePublicSceneAsset(
  admin: SupabaseClient,
  slug: string,
  sceneId: string,
  variant: "base" | "tile" | "fallback",
  col?: number,
  row?: number,
): Promise<ResolvedAsset | null> {
  const { data: tour } = await admin
    .from("project_tours")
    .select("id")
    .eq("viewer_slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!tour) return null;

  const { data: scene } = await admin
    .from("tour_scenes")
    .select("id, panorama_path, multires_manifest_path")
    .eq("id", sceneId)
    .eq("tour_id", tour.id)
    .maybeSingle();
  if (!scene) return null;

  if (variant === "fallback") {
    const { data: deriv } = await admin
      .from("tour_scene_derivatives")
      .select("storage_key")
      .eq("scene_id", scene.id)
      .eq("derivative_type", "normalized")
      .maybeSingle();
    const key = deriv?.storage_key ?? scene.panorama_path ?? null;
    if (!key) return null;
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await obj.Body?.transformToByteArray();
    return body ? { body, contentType: "image/jpeg" } : null;
  }

  if (!scene.multires_manifest_path) return null;
  const manifestObj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: scene.multires_manifest_path }));
  const raw = await manifestObj.Body?.transformToString();
  const manifest = raw ? JSON.parse(raw) : null;
  const level = manifest?.levels?.[0];
  if (!level) return null;

  const prefix = scene.multires_manifest_path.replace(/[^/]+$/, "");
  let key: string;
  if (variant === "base") {
    key = `${prefix}${manifest.baseKey}`;
  } else {
    if (col === undefined || row === undefined) return null;
    if (col < 0 || col >= level.cols || row < 0 || row >= level.rows) return null;
    const rel = (level.keyPattern as string).replace("{col}", String(col)).replace("{row}", String(row));
    key = `${prefix}${rel}`;
  }

  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await obj.Body?.transformToByteArray();
  return body ? { body, contentType: "image/jpeg" } : null;
}
