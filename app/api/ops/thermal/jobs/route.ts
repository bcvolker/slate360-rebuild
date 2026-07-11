import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { ThermalJobType } from "@/lib/thermal/types";

export const runtime = "nodejs";

const JOB_SELECT = "id, status, progress_pct, job_type, dedupe_key";

/** sha256(org + session + type + sorted capture ids) — one active job per key (R1 dedupe). */
function computeDedupeKey(orgId: string, sessionId: string, jobType: string, captureIds: string[]): string {
  const sorted = [...captureIds].sort();
  return createHash("sha256").update(`${orgId}:${sessionId}:${jobType}:${sorted.join(",")}`).digest("hex");
}

const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

const ALLOWED_JOB_TYPES: ThermalJobType[] = [
  "extract",
  "extract_analyze",
  "align",
  "analyze",
  "report",
  "full_pipeline",
];

type JobBody = {
  session_id: string;
  job_type?: ThermalJobType;
  capture_ids?: string[];
};

function isReadyCapture(row: Record<string, unknown>, jobType: ThermalJobType): boolean {
  if (jobType === "analyze") return Boolean(row.npz_data_path);
  if (jobType === "align") return Boolean(row.storage_path);
  if (jobType === "report") return Boolean(row.preview_path || row.npz_data_path);
  return Boolean(row.storage_path);
}

export const POST = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ user, admin, orgId, req: request }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await request.json().catch(() => null)) as JobBody | null;
    if (!body?.session_id) return badRequest("session_id is required");

    const jobType = ALLOWED_JOB_TYPES.includes(body.job_type ?? "extract")
      ? (body.job_type ?? "extract")
      : "extract";

    const { data: session, error: sessionError } = await admin
      .from("thermal_analysis_sessions")
      .select("id, status")
      .eq("id", body.session_id)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionError) return serverError(sessionError.message);
    if (!session) return notFound("Session not found");

    let captureQuery = admin
      .from("thermal_captures")
      .select("id, storage_path, filename, npz_data_path, preview_path")
      .eq("session_id", body.session_id)
      .eq("org_id", orgId)
      .is("deleted_at", null);

    if (body.capture_ids?.length) {
      captureQuery = captureQuery.in("id", body.capture_ids);
    }

    const { data: captures, error: capturesError } = await captureQuery;
    if (capturesError) return serverError(capturesError.message);

    const readyCaptures = (captures ?? []).filter((row) => isReadyCapture(row, jobType));
    if (!readyCaptures.length) {
      return badRequest(
        jobType === "analyze"
          ? "No captures with extracted NPZ data — run extraction first"
          : jobType === "report"
            ? "No captures with previews — run extraction first"
            : jobType === "align"
              ? "No captures with storage paths — upload files first"
              : "No captures with storage paths",
      );
    }

    const captureIds = readyCaptures.map((row) => row.id);
    const dedupeKey = computeDedupeKey(orgId, body.session_id, jobType, captureIds);

    // R1 dedupe: a double-click or a retried client request while an identical
    // job is still queued/processing returns that job instead of creating a duplicate.
    const { data: activeJob } = await admin
      .from("thermal_processing_jobs")
      .select(JOB_SELECT)
      .eq("dedupe_key", dedupeKey)
      .in("status", ["queued", "processing"])
      .maybeSingle();
    if (activeJob) return ok({ job: activeJob, deduped: true });

    const { data: job, error: jobError } = await admin
      .from("thermal_processing_jobs")
      .insert({
        session_id: body.session_id,
        org_id: orgId,
        created_by: user.id,
        job_type: jobType,
        status: "queued",
        input_capture_ids: captureIds,
        dedupe_key: dedupeKey,
      })
      .select(JOB_SELECT)
      .single();

    if (jobError || !job) {
      // Unique-violation race: another request won the insert first — return its job.
      if (jobError?.code === "23505") {
        const { data: raced } = await admin
          .from("thermal_processing_jobs")
          .select(JOB_SELECT)
          .eq("dedupe_key", dedupeKey)
          .in("status", ["queued", "processing"])
          .maybeSingle();
        if (raced) return ok({ job: raced, deduped: true });
      }
      return serverError(jobError?.message ?? "Failed to create job");
    }

    // R1 accept-then-processing: the job stays "queued" and the session stays
    // untouched until Trigger.dev actually accepts the dispatch — a dispatch
    // failure must never leave a job silently stuck at "queued" forever.
    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      const handle = await tasks.trigger(
        "thermal.process",
        { jobId: job.id },
        undefined,
        triggerRequestOptions,
      );
      console.info("[POST /api/ops/thermal/jobs] Trigger dispatch accepted", {
        jobId: job.id,
        jobType,
        runId: handle.id,
      });
    } catch (dispatchErr) {
      const msg = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
      await admin
        .from("thermal_processing_jobs")
        .update({
          status: "failed",
          error_log: `Dispatch error: ${msg}`,
          failure_reason: "dispatch_failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      await admin
        .from("thermal_analysis_sessions")
        .update({ status: "failed" })
        .eq("id", body.session_id);
      return serverError(`Failed to dispatch thermal job: ${msg}`);
    }

    const { data: processingJob } = await admin
      .from("thermal_processing_jobs")
      .update({ status: "processing" })
      .eq("id", job.id)
      .select(JOB_SELECT)
      .single();

    await admin
      .from("thermal_analysis_sessions")
      .update({ status: "processing" })
      .eq("id", body.session_id);

    return ok({ job: processingJob ?? job, triggerDispatched: true });
  });

