import { NextRequest } from "next/server";
import { ok, unauthorized, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";

export const runtime = "nodejs";

// Coarse pipeline stages the GPU worker reports as it runs. Kept in sync with the
// worker's post_progress() calls and the submit-status UI stage order.
const VALID_STAGES = new Set(["upload", "align", "train", "optimize", "export"]);

type ProgressPayload = { stage?: unknown; progress_pct?: unknown };

/**
 * Worker-only progress heartbeat. The Modal reconstruction job POSTs
 * { stage, progress_pct } at each pipeline boundary so the submit-status screen
 * can advance a staged checklist instead of freezing at the dispatch-time 5%.
 * Authed with the same HMAC worker signature as the completion callback.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;
  if (!jobId) return badRequest("jobId is required");

  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[POST /api/twin/jobs/[id]/progress] GPU_WORKER_SECRET_KEY not configured");
    return serverError("Worker callback not configured");
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-worker-signature");
  if (!verifyWorkerSignature(rawBody, signature, secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: ProgressPayload;
  try {
    body = JSON.parse(rawBody) as ProgressPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const stage = typeof body.stage === "string" ? body.stage : undefined;
  if (!stage || !VALID_STAGES.has(stage)) {
    return badRequest("stage must be one of: upload, align, train, optimize, export");
  }

  // Clamp to 1..99 — 0 reads as "not started" and 100 is reserved for the
  // completion callback that also creates the model row.
  const rawPct = typeof body.progress_pct === "number" ? body.progress_pct : NaN;
  const progressPct = Number.isFinite(rawPct)
    ? Math.min(99, Math.max(1, Math.round(rawPct)))
    : undefined;

  try {
    const admin = createAdminClient();

    // Never move a job backwards out of a terminal state: only heartbeat while it
    // is still processing/queued. A late progress post after completion is a no-op.
    const update: { stage: string; progress_pct?: number } = { stage };
    if (progressPct !== undefined) update.progress_pct = progressPct;

    const { error } = await admin
      .from("digital_twin_processing_jobs")
      .update(update)
      .eq("id", jobId)
      .in("status", ["queued", "processing"]);

    if (error) return serverError(error.message);
    return ok({ ok: true, jobId, stage, progress_pct: progressPct ?? null });
  } catch (err) {
    console.error("[POST /api/twin/jobs/[id]/progress]", err);
    return serverError(err instanceof Error ? err.message : "Progress update failed");
  }
}
