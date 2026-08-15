import { NextRequest } from "next/server";
import { unauthorized, badRequest, ok, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";
import { parseBakedExport } from "@/lib/digital-twin/bake-hash";

export const runtime = "nodejs";

type BakeCallbackBody = {
  modelId?: string;
  status?: "ready" | "failed";
  editHash?: string;
  bakedKey?: string;
  fileSizeBytes?: number;
  stats?: Record<string, unknown>;
  error?: string;
};

/**
 * E1 — Modal bake_model reports here (same HMAC scheme as the job callback).
 * Idempotent: a stale callback for a superseded editHash is acknowledged but
 * not applied, so a re-edit + re-bake can never be overwritten by the losing
 * earlier run.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) return serverError("Worker callback not configured");

  const rawBody = await req.text();
  if (!verifyWorkerSignature(rawBody, req.headers.get("x-worker-signature"), secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: BakeCallbackBody;
  try {
    body = JSON.parse(rawBody) as BakeCallbackBody;
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.modelId) return badRequest("modelId is required");
  if (body.status !== "ready" && body.status !== "failed") {
    return badRequest("status must be ready or failed");
  }
  if (!body.editHash) return badRequest("editHash is required");
  if (body.status === "ready" && !body.bakedKey) return badRequest("bakedKey is required");

  const admin = createAdminClient();
  const { data: model, error: loadErr } = await admin
    .from("digital_twin_models")
    .select("id, baked_export")
    .eq("id", body.modelId)
    .maybeSingle();
  if (loadErr) return serverError(loadErr.message);
  if (!model) return badRequest("Unknown model");

  const current = parseBakedExport(model.baked_export);
  if (current && current.editHash !== body.editHash) {
    // A newer edit_list superseded this bake while it ran — drop the result.
    return ok({ superseded: true });
  }

  const { error: updErr } = await admin
    .from("digital_twin_models")
    .update({
      baked_export: {
        status: body.status,
        editHash: body.editHash,
        ...(body.bakedKey ? { bakedKey: body.bakedKey } : {}),
        ...(typeof body.fileSizeBytes === "number" ? { fileSizeBytes: body.fileSizeBytes } : {}),
        ...(body.stats ? { stats: body.stats } : {}),
        ...(body.error ? { error: String(body.error).slice(0, 2000) } : {}),
        ...(current?.requestedAt ? { requestedAt: current.requestedAt } : {}),
        completedAt: new Date().toISOString(),
      },
    })
    .eq("id", body.modelId);
  if (updErr) return serverError(updErr.message);

  return ok({ applied: true });
}
