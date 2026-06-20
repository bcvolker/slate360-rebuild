import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

/**
 * content-studio.ingest — generate proxy + thumbnail + audio proxy for an uploaded clip.
 *
 * REAL mode (MODAL_CONTENT_INGEST_ENDPOINT set): dispatch to the Modal ingest worker,
 * which calls back to /api/content-studio/jobs/callback. MOCK mode: mark the asset ready
 * using the original as its own proxy so the editor still works with no compute.
 */

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase credentials required");
  return createClient(url, key);
};

export const contentStudioIngestTask = task({
  id: "content-studio.ingest",
  maxDuration: 900,
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    const supabase = getSupabase();

    const { data: job } = await supabase
      .from("content_render_jobs")
      .select("id, org_id, status, input_payload")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (job.status !== "queued") return { skipped: true, status: job.status };

    const input = (job.input_payload ?? {}) as {
      mediaAssetId?: string;
      storageKey?: string;
      kind?: string;
    };
    const mediaAssetId = input.mediaAssetId;
    const storageKey = input.storageKey;
    if (!mediaAssetId || !storageKey) throw new Error("input_payload.mediaAssetId/storageKey required");

    await supabase
      .from("content_render_jobs")
      .update({ status: "processing", stage: "dispatch", progress_pct: 5, started_at: new Date().toISOString() })
      .eq("id", jobId);
    await supabase.from("content_media_assets").update({ status: "processing" }).eq("id", mediaAssetId);

    const endpoint = process.env.MODAL_CONTENT_INGEST_ENDPOINT?.trim();

    // ── MOCK mode: original doubles as proxy, no compute ──────
    if (!endpoint) {
      await supabase
        .from("content_media_assets")
        .update({ status: "ready", proxy_key: storageKey })
        .eq("id", mediaAssetId);
      await supabase
        .from("content_render_jobs")
        .update({ status: "completed", progress_pct: 100, stage: "mock", completed_at: new Date().toISOString() })
        .eq("id", jobId);
      return { mock: true, jobId };
    }

    // ── REAL mode: dispatch to Modal ingest worker ────────────
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        orgId: job.org_id,
        mediaAssetId,
        storageKey,
        kind: input.kind ?? "video",
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 400);
      await supabase
        .from("content_render_jobs")
        .update({ status: "failed", error_text: `Modal dispatch ${res.status}: ${detail}`, completed_at: new Date().toISOString() })
        .eq("id", jobId);
      await supabase.from("content_media_assets").update({ status: "failed", error_text: detail }).eq("id", mediaAssetId);
      return { failed: true, status: res.status };
    }
    const runId = res.headers.get("x-modal-run-id") ?? undefined;
    if (runId) await supabase.from("content_render_jobs").update({ worker_run_id: runId }).eq("id", jobId);
    return { dispatched: true, jobId };
  },
});
