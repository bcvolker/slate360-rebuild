/**
 * PATCH /api/digital-twin/captures/[id]/assets/[assetId]
 *
 * Persists a Review & Sources chip for an already-registered asset. The client owns the
 * measured equirectangular probe; this route maps the user's intent to the existing
 * `asset_kind` field consumed by the job dispatch.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import {
  assetKindForChip,
  TWIN_SOURCE_CHIPS,
  type TwinSourceChip,
} from "@/lib/digital-twin/twin-source-chip";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; assetId: string }>;
};

const CHIP_SET = new Set<TwinSourceChip>(TWIN_SOURCE_CHIPS);

export const PATCH = (req: NextRequest, context: RouteContext) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id: captureId, assetId } = await context.params;
    const body = (await req.json().catch(() => ({}))) as { chip?: string };

    if (!body.chip || !CHIP_SET.has(body.chip as TwinSourceChip)) {
      return badRequest("chip must be one of: phone, 360, drone, lidar");
    }
    const chip = body.chip as TwinSourceChip;

    const { data: capture, error: captureError } = await admin
      .from("digital_twin_captures")
      .select("id")
      .eq("id", captureId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (captureError) return serverError(captureError.message);
    if (!capture) return notFound("Capture not found");

    const { data: asset, error: assetError } = await admin
      .from("digital_twin_capture_assets")
      .select("id, storage_key, content_type, asset_kind")
      .eq("id", assetId)
      .eq("capture_id", captureId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (assetError) return serverError(assetError.message);
    if (!asset) return notFound("Asset not found on this capture");

    const nextAssetKind = assetKindForChip(chip, {
      name: asset.storage_key?.split("/").pop() ?? "",
      type: asset.content_type ?? "",
    });

    const { error: updateError } = await admin
      .from("digital_twin_capture_assets")
      .update({ asset_kind: nextAssetKind })
      .eq("id", asset.id)
      .eq("org_id", orgId);
    if (updateError) return serverError(updateError.message);

    return ok({
      assetId: asset.id,
      chip,
      assetKind: nextAssetKind,
      unchanged: nextAssetKind === asset.asset_kind,
    });
  });
