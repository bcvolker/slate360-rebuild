import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

/**
 * content-studio.render — renders a Content Studio edit project.
 *
 * MOCK mode (default until MODAL_CONTENT_ENDPOINT is set): completes the job
 * inline with no compute, writing a placeholder output key, so the full
 * enqueue → status → realtime → SlateDrop loop works with zero cost (mirrors the
 * design.generate pattern). REAL mode dispatches to the Modal content worker,
 * which calls back to /api/content-studio/jobs/callback.
 */

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url) throw new Error("supabaseUrl is required.");
  if (!key) throw new Error("supabaseServiceKey is required.");
  return createClient(url, key);
};

async function markFailed(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  message: string,
) {
  await supabase
    .from("content_render_jobs")
    .update({ status: "failed", error_text: message, completed_at: new Date().toISOString() })
    .eq("id", jobId);
}

export const contentStudioRenderTask = task({
  id: "content-studio.render",
  maxDuration: 900,
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    const supabase = getSupabase();

    const { data: job, error } = await supabase
      .from("content_render_jobs")
      .select("id, org_id, edit_project_id, job_type, status, input_payload, spec_snapshot_key, content_hash")
      .eq("id", jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (job.status !== "queued") return { skipped: true, status: job.status };

    await supabase
      .from("content_render_jobs")
      .update({ status: "processing", stage: "starting", progress_pct: 10, started_at: new Date().toISOString() })
      .eq("id", jobId);

    const modalEndpoint = process.env.MODAL_CONTENT_ENDPOINT?.trim();

    // ── MOCK mode: complete inline, zero compute ──────────────
    if (!modalEndpoint) {
      // Passthrough the first assembled clip's proxy (a real R2 object) so the
      // download works end-to-end until the FFmpeg concat worker is deployed.
      const payload = (job.input_payload ?? {}) as { passthroughKey?: string | null };
      const outputKey = payload.passthroughKey || `mock/content-studio/${job.edit_project_id ?? "scratch"}/${jobId}.mp4`;
      await supabase
        .from("content_render_jobs")
        .update({
          status: "completed",
          stage: payload.passthroughKey ? "preview-passthrough" : "mock-complete",
          progress_pct: 100,
          output_storage_key: outputKey,
          outputs: [{ kind: "video", storageKey: outputKey }],
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (job.edit_project_id) {
        await supabase
          .from("content_edit_projects")
          .update({ last_render_job_id: jobId, last_rendered_at: new Date().toISOString(), status: "ready" })
          .eq("id", job.edit_project_id);
      }
      return { mock: true, jobId, outputKey };
    }

    // ── REAL mode: dispatch to Modal (worker calls back when done) ──
    try {
      const res = await fetch(modalEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          orgId: job.org_id,
          editProjectId: job.edit_project_id,
          jobType: job.job_type,
          specSnapshotKey: job.spec_snapshot_key,
          contentHash: job.content_hash,
        }),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 500);
        await markFailed(supabase, jobId, `Modal dispatch failed (${res.status}): ${detail}`);
        return { failed: true, status: res.status };
      }
      const workerRunId = res.headers.get("x-modal-run-id") ?? undefined;
      if (workerRunId) {
        await supabase.from("content_render_jobs").update({ worker_run_id: workerRunId }).eq("id", jobId);
      }
      return { dispatched: true, jobId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markFailed(supabase, jobId, `Modal dispatch error: ${message}`);
      throw err;
    }
  },
});
