import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";

/**
 * POST /api/design-studio/jobs/callback
 * Signed (HMAC) callback from the Modal design-preview worker. Updates the job
 * and its variant; sets the session's active variant on completion.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-worker-signature");
  if (!verifyWorkerSignature(raw, sig, process.env.GPU_WORKER_SECRET_KEY)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    jobId?: string;
    status?: "completed" | "failed" | "progress";
    progressPct?: number;
    stage?: string;
    previewKey?: string;
    outputKey?: string;
    thumbnailKey?: string;
    modelFormat?: string;
    qualityMetrics?: Record<string, unknown>;
    errorLog?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.jobId || !body.status) {
    return NextResponse.json({ error: "jobId and status required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("design_generation_jobs")
    .select("id, session_id, variant_id")
    .eq("id", body.jobId)
    .single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (body.status === "progress") {
    await admin
      .from("design_generation_jobs")
      .update({ status: "processing", progress_pct: body.progressPct ?? 0, stage: body.stage ?? null })
      .eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  if (body.status === "failed") {
    await admin
      .from("design_generation_jobs")
      .update({ status: "failed", error_text: body.errorLog ?? "Worker failed", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    await admin
      .from("design_variants")
      .update({ status: "failed", error_text: body.errorLog ?? "Worker failed" })
      .eq("id", job.variant_id);
    return NextResponse.json({ ok: true });
  }

  // completed
  await admin
    .from("design_variants")
    .update({
      status: "ready",
      preview_storage_key: body.previewKey ?? null,
      final_storage_key: body.outputKey ?? null,
      thumbnail_storage_key: body.thumbnailKey ?? null,
      model_format: body.modelFormat ?? null,
    })
    .eq("id", job.variant_id);
  await admin
    .from("design_generation_jobs")
    .update({
      status: "completed",
      progress_pct: 100,
      output_storage_key: body.outputKey ?? body.previewKey ?? null,
      quality_metrics: body.qualityMetrics ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  await admin.from("design_sessions").update({ active_variant_id: job.variant_id }).eq("id", job.session_id);

  return NextResponse.json({ ok: true });
}
