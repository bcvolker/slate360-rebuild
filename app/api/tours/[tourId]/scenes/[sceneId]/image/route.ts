import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError, unauthorized } from "@/lib/server/api-response";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * GET /api/tours/[tourId]/scenes/[sceneId]/image?variant=full|thumbnail|tiles
 *
 * Tour assets live in a PRIVATE bucket (no public CDN base), so the viewer can't load
 * the raw S3 key. This mints a short-lived signed GET URL for the best READY derivative
 * of a scene. Falls back to the original panorama key when no derivative exists yet
 * (e.g. before the Modal ingest worker has run).
 *
 * Mirrors the upload PUT-presign pattern in ../upload/route.ts.
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string; sceneId: string }> },
) => {
  const { tourId, sceneId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    const variant = (new URL(req.url).searchParams.get("variant") ?? "full").toLowerCase();

    try {
      // Scope the scene to the caller's org via the parent tour (defense in depth on top
      // of the CEO-gated route + RLS). Read snake_case columns directly.
      const { data: tour } = await admin
        .from("project_tours")
        .select("id")
        .eq("id", tourId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!tour) return notFound("Tour not found");

      const { data: scene } = await admin
        .from("tour_scenes")
        .select("id, panorama_path, thumbnail_path, multires_manifest_path")
        .eq("id", sceneId)
        .eq("tour_id", tourId)
        .maybeSingle();
      if (!scene) return notFound("Scene not found");

      // Pick the key for the requested variant, preferring ready derivatives.
      let key: string | null = null;
      if (variant === "thumbnail") {
        key = scene.thumbnail_path ?? scene.panorama_path ?? null;
      } else if (variant === "tiles") {
        key = scene.multires_manifest_path ?? null;
      } else {
        // "full": prefer a normalized/tiled-base derivative when present, else original.
        const { data: deriv } = await admin
          .from("tour_scene_derivatives")
          .select("storage_key, derivative_type")
          .eq("scene_id", sceneId)
          .in("derivative_type", ["normalized", "original"])
          .order("derivative_type", { ascending: true }) // 'normalized' < 'original'
          .limit(1)
          .maybeSingle();
        key = deriv?.storage_key ?? scene.panorama_path ?? null;
      }

      if (!key) return badRequest(`No ${variant} asset available for this scene yet`);

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 3600 },
      );

      return ok({ url, variant, key, expiresIn: 3600 });
    } catch (err: unknown) {
      console.error("[GET /api/tours/:tourId/scenes/:sceneId/image] Error:", err);
      return serverError("Failed to sign scene image URL");
    }
  });
};
