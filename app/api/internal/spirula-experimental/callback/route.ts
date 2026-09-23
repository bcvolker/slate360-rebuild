import { NextRequest } from "next/server";
import { badRequest, ok, serverError, unauthorized } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";

export const runtime = "nodejs";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  const raw = await req.text();
  if (!verifyWorkerSignature(raw, req.headers.get("x-worker-signature"), secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: {
    experimentId?: string;
    status?: string;
    trainerSha?: string;
    artifactPrefix?: string;
    metrics?: unknown;
    cost?: unknown;
    hardware?: unknown;
    error?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.experimentId || !body.status) return badRequest("experimentId and status are required");
  if (!TERMINAL.has(body.status)) return badRequest("callback status must be terminal");

  try {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("spirula_experimental_jobs")
      .select("id, status")
      .eq("experiment_id", body.experimentId)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!row) return ok({ accepted: true, recorded: false });
    if (TERMINAL.has(row.status)) return ok({ accepted: true, idempotent: true, status: row.status });

    const { error: updateError } = await admin
      .from("spirula_experimental_jobs")
      .update({
        status: body.status,
        trainer_sha: body.trainerSha,
        artifact_prefix: body.artifactPrefix ?? null,
        metrics: { metrics: body.metrics ?? null, hardware: body.hardware ?? null },
        cost: body.cost ?? null,
        error_text: body.error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", row.status);
    if (updateError) return serverError(updateError.message);
    return ok({ accepted: true, experimentId: body.experimentId, status: body.status });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "callback failed");
  }
}
