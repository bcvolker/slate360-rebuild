import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";

/**
 * Modal → Slate360 callback for Content Studio render/ingest/enhance jobs.
 * HMAC-verified with the shared GPU_WORKER_SECRET_KEY (same scheme as twin/thermal).
 * Used by REAL-mode workers; MOCK mode completes inline in the Trigger task.
 */
export const dynamic = "force-dynamic";

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-worker-signature");
  if (!verifyWorkerSignature(rawBody, signature, process.env.GPU_WORKER_SECRET_KEY)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const jobId = typeof payload.jobId === "string" ? payload.jobId : null;
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const status = typeof payload.status === "string" ? payload.status : "processing";
  const supabase = svc();

  const update: Record<string, unknown> = { status };
  if (typeof payload.progressPct === "number") update.progress_pct = payload.progressPct;
  if (typeof payload.stage === "string") update.stage = payload.stage;
  if (typeof payload.workerRunId === "string") update.worker_run_id = payload.workerRunId;
  if (Array.isArray(payload.outputs)) update.outputs = payload.outputs;
  if (typeof payload.outputStorageKey === "string") update.output_storage_key = payload.outputStorageKey;
  if (payload.error && typeof payload.error === "object") {
    update.error_text = (payload.error as { message?: string }).message ?? "worker error";
  }
  if (status === "completed" || status === "failed" || status === "cancelled") {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("content_render_jobs").update(update).eq("id", jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ingest jobs also update the media asset row (proxy/thumbnail/metadata/status).
  const mediaAssetId = typeof payload.mediaAssetId === "string" ? payload.mediaAssetId : null;
  if (mediaAssetId) {
    const assetUpdate: Record<string, unknown> = {};
    if (status === "completed") {
      assetUpdate.status = "ready";
      if (typeof payload.proxyKey === "string") assetUpdate.proxy_key = payload.proxyKey;
      if (typeof payload.thumbnailKey === "string") assetUpdate.thumbnail_key = payload.thumbnailKey;
      if (typeof payload.audioProxyKey === "string") assetUpdate.audio_proxy_key = payload.audioProxyKey;
      if (typeof payload.durationSec === "number") assetUpdate.duration_sec = payload.durationSec;
      if (typeof payload.width === "number") assetUpdate.width = payload.width;
      if (typeof payload.height === "number") assetUpdate.height = payload.height;
      if (typeof payload.fps === "number") assetUpdate.fps = payload.fps;
      if (typeof payload.hasAudio === "boolean") assetUpdate.has_audio = payload.hasAudio;
    } else if (status === "failed") {
      assetUpdate.status = "failed";
      if (update.error_text) assetUpdate.error_text = update.error_text;
    }
    if (Object.keys(assetUpdate).length > 0) {
      await supabase.from("content_media_assets").update(assetUpdate).eq("id", mediaAssetId);
    }
  }

  return NextResponse.json({ ok: true });
}
