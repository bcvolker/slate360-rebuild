/**
 * POST /api/digital-twin/captures/[id]/raw-retention
 *
 * Records the user's choice about keeping the raw uploaded source files for a
 * twin capture, and — when they decline — frees the storage by soft-deleting
 * the raw input assets. The processed model lives in a separate table
 * (digital_twin_models) and is never touched here.
 *
 * Body: { keep: boolean }
 *   keep=true  → record the choice; raw files are retained for reuse.
 *   keep=false → record the choice and discard raw input assets. Only allowed
 *                AFTER processing has completed (a completed processing job
 *                exists), so we never starve an in-flight reconstruction.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { softDeleteTwinCaptureAsset } from "@/lib/twin/soft-delete";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId, user }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as { keep?: boolean };
    if (typeof body.keep !== "boolean") return badRequest("keep (boolean) is required");

    const { data: capture } = await admin
      .from("digital_twin_captures")
      .select("id, capture_metadata")
      .eq("id", id)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!capture) return notFound("Capture not found");

    // Record the choice (zero-migration: lives in capture_metadata).
    const meta =
      capture.capture_metadata && typeof capture.capture_metadata === "object"
        ? (capture.capture_metadata as Record<string, unknown>)
        : {};
    await admin
      .from("digital_twin_captures")
      .update({
        capture_metadata: { ...meta, retain_raw: body.keep, raw_decision_at: new Date().toISOString() },
      })
      .eq("id", id)
      .eq("org_id", orgId);

    if (body.keep) return ok({ kept: true });

    // Discard path. Safe only once the model exists — if processing hasn't
    // finished yet, the choice is recorded above and the job callback discards
    // the raw inputs on completion (so it's never starved mid-reconstruction).
    const { data: completedJob } = await admin
      .from("digital_twin_processing_jobs")
      .select("id")
      .eq("capture_id", id)
      .eq("org_id", orgId)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();
    if (!completedJob) {
      return ok({ kept: false, deferred: true });
    }

    const { data: assets, error } = await admin
      .from("digital_twin_capture_assets")
      .select("id, file_size_bytes")
      .eq("capture_id", id)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .neq("status", "archived");
    if (error) return serverError(error.message);

    let freedBytes = 0;
    for (const asset of assets ?? []) {
      await softDeleteTwinCaptureAsset(admin, { assetId: asset.id, orgId, deletedBy: user.id });
      freedBytes += Number(asset.file_size_bytes) || 0;
    }

    return ok({ kept: false, discarded: (assets ?? []).length, freedBytes });
  });
