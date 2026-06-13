import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { ThermalJobType } from "@/lib/thermal/types";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error("supabaseUrl is required.");
  if (!supabaseServiceKey) throw new Error("supabaseServiceKey is required.");
  return createClient(supabaseUrl, supabaseServiceKey);
};

function getModalEndpoint(): string {
  const url = process.env.MODAL_THERMAL_ENDPOINT?.trim();
  if (!url) throw new Error("MODAL_THERMAL_ENDPOINT is not configured");
  return url;
}

async function markJobFailed(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  message: string,
) {
  const { data: job } = await supabase
    .from("thermal_processing_jobs")
    .select("session_id")
    .eq("id", jobId)
    .maybeSingle();

  await supabase
    .from("thermal_processing_jobs")
    .update({
      status: "failed",
      error_log: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (job?.session_id) {
    await supabase
      .from("thermal_analysis_sessions")
      .update({ status: "failed" })
      .eq("id", job.session_id);
  }
}

function captureSelectForJobType(jobType: ThermalJobType): string {
  if (jobType === "analyze" || jobType === "report") {
    return "id, storage_path, filename, npz_data_path, preview_path, anomalies";
  }
  return "id, storage_path, filename, npz_data_path, preview_path";
}

function filterReadyCaptures(
  rows: Array<Record<string, unknown>>,
  jobType: ThermalJobType,
): Array<Record<string, unknown>> {
  if (jobType === "analyze") {
    return rows.filter((row) => row.npz_data_path);
  }
  if (jobType === "report") {
    return rows.filter((row) => row.preview_path || row.npz_data_path);
  }
  return rows.filter((row) => row.storage_path);
}

async function dispatchToModal(
  payload: Record<string, unknown>,
  jobId: string,
  supabase: ReturnType<typeof getSupabase>,
) {
  const response = await fetch(getModalEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    await markJobFailed(
      supabase,
      jobId,
      `Modal dispatch failed (${response.status}): ${detail || response.statusText}`,
    );
    return { failed: true as const, status: response.status };
  }

  const workerRunId = response.headers.get("x-modal-run-id") ?? undefined;
  if (workerRunId) {
    await supabase
      .from("thermal_processing_jobs")
      .update({ worker_run_id: workerRunId })
      .eq("id", jobId);
  }

  return { dispatched: true as const };
}

async function runThermalProcessJob(jobId: string) {
  const supabase = getSupabase();

  const { data: job, error: jobError } = await supabase
    .from("thermal_processing_jobs")
    .select("id, org_id, session_id, job_type, status, input_capture_ids")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) throw new Error(jobError.message);
  if (!job) throw new Error(`Job not found: ${jobId}`);

  if (job.status !== "queued") {
    console.log(`[thermal.process] Job ${jobId} status=${job.status}, skipping dispatch`);
    return { skipped: true, status: job.status };
  }

  const jobType = (job.job_type ?? "extract") as ThermalJobType;
  const captureIds = job.input_capture_ids ?? [];
  if (!captureIds.length) {
    await markJobFailed(supabase, jobId, "No capture IDs on job");
    return { failed: true, reason: "missing_capture_ids" };
  }

  const { data: session, error: sessionError } = await supabase
    .from("thermal_analysis_sessions")
    .select("name, branding_config, summary_metrics")
    .eq("id", job.session_id)
    .maybeSingle();

  if (sessionError) throw new Error(sessionError.message);
  if (!session) {
    await markJobFailed(supabase, jobId, "Session not found for job");
    return { failed: true, reason: "missing_session" };
  }

  const { data: captures, error: capturesError } = await supabase
    .from("thermal_captures")
    .select(captureSelectForJobType(jobType))
    .in("id", captureIds)
    .eq("org_id", job.org_id)
    .is("deleted_at", null);

  if (capturesError) throw new Error(capturesError.message);

  const readyCaptures = filterReadyCaptures(
    (captures ?? []) as unknown as Array<Record<string, unknown>>,
    jobType,
  );
  if (!readyCaptures.length) {
    await markJobFailed(supabase, jobId, "No ready captures for this job type");
    return { failed: true, reason: "missing_ready_captures" };
  }

  await supabase
    .from("thermal_processing_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      progress_pct: 5,
      stage: "dispatch",
    })
    .eq("id", jobId);

  const dispatchPayload = {
    jobId: job.id,
    sessionId: job.session_id,
    orgId: job.org_id,
    jobType,
    sessionMeta: {
      name: session.name,
      branding: session.branding_config ?? {},
      summary: session.summary_metrics ?? {},
    },
    captures: readyCaptures.map((row) => ({
      captureId: row.id,
      storagePath: row.storage_path,
      filename: row.filename,
      npzDataPath: row.npz_data_path,
      previewPath: row.preview_path,
      anomalies: row.anomalies,
    })),
  };

  const result = await dispatchToModal(dispatchPayload, jobId, supabase);
  if ("failed" in result && result.failed) return result;
  console.log(`[thermal.process] Dispatched job ${jobId} (${jobType}) to Modal`);
  return { dispatched: true, jobId, jobType, captureCount: readyCaptures.length };
}

export const thermalProcessTask = task({
  id: "thermal.process",
  maxDuration: 120,
  run: async (payload: { jobId: string }) => {
    try {
      return await runThermalProcessJob(payload.jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markJobFailed(getSupabase(), payload.jobId, `Modal dispatch error: ${message}`);
      throw err;
    }
  },
});

/** @deprecated Use thermal.process — kept so in-flight runs still resolve. */
export const thermalExtractTask = task({
  id: "thermal.extract",
  maxDuration: 120,
  run: async (payload: { jobId: string }) => runThermalProcessJob(payload.jobId),
});
