import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error("supabaseUrl is required.");
  if (!supabaseServiceKey) throw new Error("supabaseServiceKey is required.");
  return createClient(supabaseUrl, supabaseServiceKey);
};

async function markJobFailed(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  variantId: string,
  message: string,
) {
  await supabase
    .from("design_generation_jobs")
    .update({ status: "failed", error_text: message, completed_at: new Date().toISOString() })
    .eq("id", jobId);
  await supabase.from("design_variants").update({ status: "failed", error_text: message }).eq("id", variantId);
}

/**
 * design.generate — produces a preview for a Design Studio variant.
 *
 * Mock mode (default until MODAL_DESIGN_ENDPOINT is set): completes the job
 * immediately using the session's source asset as a stand-in preview, so the
 * full prompt → job → variant-ready → realtime-UI loop works with no GPU spend.
 *
 * Real mode: dispatches to the Modal asset-gen worker, which calls back to
 * /api/design-studio/jobs/callback when finished.
 */
export const designGenerateTask = task({
  id: "design.generate",
  maxDuration: 300,
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    const supabase = getSupabase();

    const { data: job, error: jobError } = await supabase
      .from("design_generation_jobs")
      .select("id, org_id, session_id, variant_id, job_type, status, input_payload")
      .eq("id", jobId)
      .maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (job.status !== "queued") {
      return { skipped: true, status: job.status };
    }

    const { data: session } = await supabase
      .from("design_sessions")
      .select("id, source_storage_key, source_format")
      .eq("id", job.session_id)
      .maybeSingle();

    await supabase
      .from("design_generation_jobs")
      .update({ status: "processing", started_at: new Date().toISOString(), progress_pct: 10 })
      .eq("id", jobId);

    const modalEndpoint = process.env.MODAL_DESIGN_ENDPOINT?.trim();

    // ── Mock mode: complete inline, no GPU ────────────────────
    if (!modalEndpoint) {
      const preview = session?.source_storage_key ?? null;
      await supabase
        .from("design_variants")
        .update({
          status: "ready",
          model_format: session?.source_format ?? null,
          preview_storage_key: preview,
        })
        .eq("id", job.variant_id);
      await supabase
        .from("design_generation_jobs")
        .update({ status: "completed", progress_pct: 100, completed_at: new Date().toISOString() })
        .eq("id", jobId);
      await supabase
        .from("design_sessions")
        .update({ active_variant_id: job.variant_id })
        .eq("id", job.session_id);
      return { mock: true, jobId, variantId: job.variant_id };
    }

    // ── Real mode: dispatch to Modal ──────────────────────────
    try {
      const response = await fetch(modalEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          orgId: job.org_id,
          sessionId: job.session_id,
          variantId: job.variant_id,
          jobType: job.job_type,
          sourceKey: session?.source_storage_key ?? null,
          sourceFormat: session?.source_format ?? null,
          plan: job.input_payload,
        }),
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 500);
        await markJobFailed(supabase, jobId, job.variant_id, `Modal dispatch failed (${response.status}): ${detail}`);
        return { failed: true, status: response.status };
      }
      const workerRunId = response.headers.get("x-modal-run-id") ?? undefined;
      if (workerRunId) {
        await supabase.from("design_generation_jobs").update({ worker_run_id: workerRunId }).eq("id", jobId);
      }
      return { dispatched: true, jobId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markJobFailed(supabase, jobId, job.variant_id, `Modal dispatch error: ${message}`);
      throw err;
    }
  },
});
