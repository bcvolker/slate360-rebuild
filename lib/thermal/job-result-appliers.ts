import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ThermalWorkerAlignResult,
  ThermalWorkerAnalyzeResult,
  ThermalWorkerCaptureResult,
  ThermalWorkerReportOutput,
} from "@/lib/thermal/types";
import { bridgeThermalReportDeliverables } from "@/lib/thermal/slatedrop-bridge";

type AdminClient = SupabaseClient;

/** Per-result-kind writers for a worker callback — split out of job-callback.ts (file-size gate). */

export async function applyExtractResults(admin: AdminClient, results: ThermalWorkerCaptureResult[]) {
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

export async function applyAnalyzeResults(admin: AdminClient, results: ThermalWorkerAnalyzeResult[]) {
  for (const result of results) {
    await admin
      .from("thermal_captures")
      .update({ anomalies: result.anomalies ?? [] })
      .eq("id", result.captureId);
  }
}

export async function applyAlignResults(admin: AdminClient, results: ThermalWorkerAlignResult[]) {
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

export async function insertReportRow(
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
