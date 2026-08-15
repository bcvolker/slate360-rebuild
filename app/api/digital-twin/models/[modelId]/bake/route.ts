import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { computeEditListHash, isBakeFresh, parseBakedExport } from "@/lib/digital-twin/bake-hash";

export const runtime = "nodejs";

/**
 * E1 — bake the model's current edit_list into a downloadable .spz.
 *
 * POST dispatches a bake to the Modal worker (action:"bake" on the existing
 * authenticated dispatch endpoint); the worker calls back to
 * /api/digital-twin/models/bake-callback which fills baked_export.
 * GET reports the bake state + freshness against the CURRENT edit_list.
 */
export const GET = (req: NextRequest, ctx: { params: Promise<{ modelId: string }> }) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { modelId } = await ctx.params;
    const { data: model } = await admin
      .from("digital_twin_models")
      .select("id, edit_list, baked_export")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!model) return notFound("Model not found");
    return ok({
      bake: parseBakedExport(model.baked_export),
      fresh: isBakeFresh(model.baked_export, model.edit_list),
      editCount: Array.isArray(model.edit_list) ? model.edit_list.length : 0,
    });
  });

export const POST = (req: NextRequest, ctx: { params: Promise<{ modelId: string }> }) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const endpoint = process.env.MODAL_TWIN_ENDPOINT?.trim();
    const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
    if (!endpoint || !secret) return serverError("Bake dispatch not configured");

    const { modelId } = await ctx.params;
    const { data: model } = await admin
      .from("digital_twin_models")
      .select("id, storage_key, model_format, edit_list, baked_export, status")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!model?.storage_key) return notFound("Model not found");
    if (model.status !== "ready") return badRequest("Model is not ready");
    if (!model.storage_key.endsWith(".spz")) {
      return badRequest("Bake supports splat (.spz) models only");
    }
    const editList = Array.isArray(model.edit_list) ? model.edit_list : [];
    if (editList.length === 0) {
      return badRequest("No edits to bake — the original file already matches the view");
    }
    if (isBakeFresh(model.baked_export, editList)) {
      return ok({ alreadyFresh: true, bake: parseBakedExport(model.baked_export) });
    }
    const current = parseBakedExport(model.baked_export);
    const editHash = computeEditListHash(editList);
    if (current?.status === "baking" && current.editHash === editHash) {
      return ok({ alreadyBaking: true, bake: current });
    }

    const outputKey = model.storage_key.replace(/\.spz$/, ".baked.spz");
    const { error: markErr } = await admin
      .from("digital_twin_models")
      .update({
        baked_export: {
          status: "baking",
          editHash,
          requestedAt: new Date().toISOString(),
        },
      })
      .eq("id", modelId)
      .eq("org_id", orgId);
    if (markErr) return serverError(markErr.message);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dispatch-token": secret,
      },
      body: JSON.stringify({
        action: "bake",
        modelId,
        sourceKey: model.storage_key,
        outputKey,
        editList,
        editHash,
      }),
    });
    if (!res.ok) {
      // Roll the marker back so the UI doesn't strand in "baking".
      await admin
        .from("digital_twin_models")
        .update({
          baked_export: {
            status: "failed",
            editHash,
            error: `dispatch ${res.status}`,
            completedAt: new Date().toISOString(),
          },
        })
        .eq("id", modelId)
        .eq("org_id", orgId);
      return serverError(`Bake dispatch failed (${res.status})`);
    }

    return ok({ dispatched: true, editHash });
  });
