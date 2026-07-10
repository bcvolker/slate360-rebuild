import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ThermalWorkerAnalyzeResult,
  ThermalWorkerAlignResult,
  ThermalWorkerCallbackPayload,
  ThermalWorkerCaptureResult,
  ThermalWorkerReportOutput,
} from "@/lib/thermal/types";
import { bridgeThermalReportDeliverables } from "@/lib/thermal/slatedrop-bridge";

type AdminClient = SupabaseClient;

export type ThermalJobCallbackResult = {
  ok: boolean;
  status: number;
  error?: string;
  idempotent?: boolean;
};

function averageConfidence(results: ThermalWorkerCaptureResult[]): number {
  const scores = results
    .map((r) => r.qualityMetrics?.confidence_score)
    .filter((v): v is number => typeof v === "number");
  if (!scores.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function countActionAnomalies(results: ThermalWorkerAnalyzeResult[]): number {
  let total = 0;
  for (const row of results) {
    for (const anomaly of row.anomalies ?? []) {
      if (anomaly && typeof anomaly === "object" && (anomaly as { severity?: string }).severity === "action") {
        total += 1;
      }
    }
  }
  return total;
}

async function applyExtractResults(admin: AdminClient, results: ThermalWorkerCaptureResult[]) {
  for (const result of results) {
    const patch: Record<string, unknown> = {
      quality_metrics: result.qualityMetrics ?? {},
      sensor_profile: result.sensorProfile ?? {},
    };
    if (result.npzDataPath) patch.npz_data_path = result.npzDataPath;
    if (result.previewPath) patch.preview_path = result.previewPath;
    if (result.error) {
      patch.telemetry = { extract_error: result.error };
    }
    await admin.from("thermal_captures").update(patch).eq("id", result.captureId);
  }
}

async function applyAnalyzeResults(admin: AdminClient, results: ThermalWorkerAnalyzeResult[]) {
  for (const result of results) {
    await admin
      .from("thermal_captures")
      .update({ anomalies: result.anomalies ?? [] })
      .eq("id", result.captureId);
  }
}

async function applyAlignResults(admin: AdminClient, results: ThermalWorkerAlignResult[]) {
  for (const result of results) {
    const { data: existing } = await admin
      .from("thermal_captures")
      .select("telemetry")
      .eq("id", result.captureId)
      .maybeSingle();

    const prior = (existing?.telemetry as Record<string, unknown>) ?? {};
    await admin
      .from("thermal_captures")
      .update({
        telemetry: {
          ...prior,
          alignment: {
            manifest: result.alignManifest,
            quality: result.qualityMetrics?.alignment_quality ?? "approximate",
          },
        },
      })
      .eq("id", result.captureId);
  }
}

async function insertReportRow(
  admin: AdminClient,
  job: { id: string; session_id: string; org_id: string | null; created_by: string | null },
  report: ThermalWorkerReportOutput,
) {
  await admin.from("thermal_analysis_reports").insert({
    session_id: job.session_id,
    org_id: job.org_id,
    created_by: job.created_by,
    title: report.title,
    template_id: report.templateId ?? "executive_one_pager",
    storage_key: report.pdfKey,
    html_storage_key: report.htmlKey,
    generated_at: new Date().toISOString(),
    config: { job_id: job.id },
  });

  // Index finished deliverables into SlateDrop when the session is linked to a project.
  await bridgeThermalReportDeliverables(admin, job, report);
}

async function refreshSessionSummary(
  admin: AdminClient,
  sessionId: string,
  jobId: string,
  extractResults: ThermalWorkerCaptureResult[],
  analyzeResults: ThermalWorkerAnalyzeResult[],
  extraMetrics?: Record<string, unknown>,
) {
  const { data: existing } = await admin
    .from("thermal_analysis_sessions")
    .select("summary_metrics, metadata")
    .eq("id", sessionId)
    .maybeSingle();

  const prior = (existing?.summary_metrics as Record<string, unknown>) ?? {};
  const priorMetadata = (existing?.metadata as Record<string, unknown>) ?? {};
  const sessionQuality = averageConfidence(extractResults);
  const radiometricCount = extractResults.filter((r) => r.qualityMetrics?.is_radiometric).length;
  const maxTemp = extractResults.reduce((max, r) => {
    const v = r.qualityMetrics?.max_temp_c;
    return typeof v === "number" && v > max ? v : max;
  }, Number.NEGATIVE_INFINITY);

  const { count: captureCount } = await admin
    .from("thermal_captures")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .is("deleted_at", null);

  const criticalAnomalies =
    typeof extraMetrics?.critical_anomalies === "number"
      ? extraMetrics.critical_anomalies
      : analyzeResults.length
        ? countActionAnomalies(analyzeResults)
        : prior.critical_anomalies ?? 0;

  await admin
    .from("thermal_analysis_sessions")
    .update({
      status: "complete",
      summary_metrics: {
        ...prior,
        ...(extractResults.length
          ? {
              total_captures: captureCount ?? extractResults.length,
              radiometric_captures: radiometricCount,
              max_detected_temp_c: Number.isFinite(maxTemp) ? maxTemp : null,
              avg_confidence_score: sessionQuality || null,
            }
          : {}),
        critical_anomalies: criticalAnomalies,
      },
      // Merge — a completing job must never erase session metadata written by
      // other flows (motion_requests, ai_interpret status, operator fields).
      metadata: {
        ...priorMetadata,
        last_job_id: jobId,
        session_confidence: sessionQuality || prior.avg_confidence_score,
        radiometric_count: radiometricCount || prior.radiometric_captures,
      },
    })
    .eq("id", sessionId);
}

export async function handleThermalJobCallback(
  admin: AdminClient,
  body: ThermalWorkerCallbackPayload,
): Promise<ThermalJobCallbackResult> {
  if (!body?.jobId || !body.status) {
    return { ok: false, status: 400, error: "jobId and status are required" };
  }

  const { data: job, error: jobError } = await admin
    .from("thermal_processing_jobs")
    .select("id, session_id, org_id, status, job_type, created_by, input_capture_ids")
    .eq("id", body.jobId)
    .maybeSingle();

  if (jobError) return { ok: false, status: 500, error: jobError.message };
  if (!job) return { ok: false, status: 404, error: "Job not found" };

  if (job.status === "completed" && body.status === "completed") {
    return { ok: true, status: 200, idempotent: true };
  }
  if (job.status === "failed" && body.status === "failed") {
    return { ok: true, status: 200, idempotent: true };
  }

  if (body.status === "progress") {
    await admin
      .from("thermal_processing_jobs")
      .update({
        status: "processing",
        progress_pct: body.progressPct ?? undefined,
        stage: body.stage ?? undefined,
      })
      .eq("id", job.id);
    return { ok: true, status: 200 };
  }

  if (body.status === "failed") {
    await admin
      .from("thermal_processing_jobs")
      .update({
        status: "failed",
        error_log: body.errorLog ?? "Worker reported failure",
        completed_at: new Date().toISOString(),
        progress_pct: body.progressPct ?? 0,
      })
      .eq("id", job.id);

    await admin
      .from("thermal_analysis_sessions")
      .update({ status: "failed" })
      .eq("id", job.session_id);

    return { ok: true, status: 200 };
  }

  const extractResults = body.captureResults ?? [];
  const analyzeResults = body.analyzeResults ?? [];
  const reportOutput = body.reportOutput;

  if (extractResults.length) {
    await applyExtractResults(admin, extractResults);
  }
  if (analyzeResults.length) {
    await applyAnalyzeResults(admin, analyzeResults);
  }
  const alignResults = body.alignResults ?? [];
  if (alignResults.length) {
    await applyAlignResults(admin, alignResults);
  }
  if (reportOutput?.pdfKey) {
    await insertReportRow(admin, job, reportOutput);
  }

  const outputStorageKeys: Record<string, unknown> = {};
  if (extractResults.length) {
    outputStorageKeys.captures = extractResults.map((r) => ({
      captureId: r.captureId,
      npz: r.npzDataPath,
      preview: r.previewPath,
    }));
  }
  if (alignResults.length) {
    outputStorageKeys.align = alignResults.map((r) => ({
      captureId: r.captureId,
      manifest: r.alignManifest,
    }));
  }
  if (reportOutput) {
    outputStorageKeys.report = reportOutput;
  }

  await admin
    .from("thermal_processing_jobs")
    .update({
      status: "completed",
      progress_pct: 100,
      stage: "complete",
      completed_at: new Date().toISOString(),
      quality_metrics: body.qualityMetrics ?? {},
      output_storage_keys: outputStorageKeys,
      error_log: null,
    })
    .eq("id", job.id);

  if (extractResults.length || analyzeResults.length) {
    await refreshSessionSummary(
      admin,
      job.session_id,
      job.id,
      extractResults,
      analyzeResults,
      body.qualityMetrics,
    );
  } else if (reportOutput) {
    await admin
      .from("thermal_analysis_sessions")
      .update({ status: "complete" })
      .eq("id", job.session_id);
  } else if (alignResults.length) {
    await admin
      .from("thermal_analysis_sessions")
      .update({ status: "complete" })
      .eq("id", job.session_id);
  }

  return { ok: true, status: 200 };
}
