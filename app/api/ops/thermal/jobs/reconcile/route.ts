import { NextRequest } from "next/server";
import { ok, unauthorized, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const QUEUED_SLA_MS = 15 * 60 * 1000;
const PROCESSING_SLA_MS = 45 * 60 * 1000;

function hasValidSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  return bearer === secret;
}

/**
 * R1 stuck-job reconciler (Addendum H2): a job that never gets a callback must
 * not sit "queued"/"processing" forever and read as silently fine. Sweeps every
 * 10 min (vercel.json cron) and fails anything past its SLA with a reason —
 * the UI's job chip then offers Retry instead of showing a false "in progress".
 */
export async function GET(req: NextRequest) {
  if (!hasValidSecret(req)) return unauthorized();

  try {
    const admin = createAdminClient();
    const now = Date.now();
    let failed = 0;

    const { data: queued } = await admin
      .from("thermal_processing_jobs")
      .select("id, session_id, created_at")
      .eq("status", "queued");
    for (const job of queued ?? []) {
      if (now - new Date(job.created_at).getTime() < QUEUED_SLA_MS) continue;
      await admin
        .from("thermal_processing_jobs")
        .update({
          status: "failed",
          failure_reason: "worker unresponsive — Retry",
          error_log: "Reconciler: job stayed queued past the 15-minute dispatch SLA",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      await admin.from("thermal_analysis_sessions").update({ status: "failed" }).eq("id", job.session_id);
      failed += 1;
    }

    const { data: processing } = await admin
      .from("thermal_processing_jobs")
      .select("id, session_id, updated_at")
      .eq("status", "processing");
    for (const job of processing ?? []) {
      if (now - new Date(job.updated_at).getTime() < PROCESSING_SLA_MS) continue;
      await admin
        .from("thermal_processing_jobs")
        .update({
          status: "failed",
          failure_reason: "worker unresponsive — Retry",
          error_log: "Reconciler: no progress callback past the 45-minute processing SLA",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      await admin.from("thermal_analysis_sessions").update({ status: "failed" }).eq("id", job.session_id);
      failed += 1;
    }

    return ok({ ok: true, failed, checked: (queued?.length ?? 0) + (processing?.length ?? 0) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/ops/thermal/jobs/reconcile]", { error: message });
    return serverError(message);
  }
}
