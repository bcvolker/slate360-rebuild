import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { buildEditSpec } from "@/lib/content-studio/build-spec";

export const dynamic = "force-dynamic";

type ClipInput = { assetId: string; trimInSec?: number; trimOutSec?: number; speedFactor?: number; reversed?: boolean };
type OutputInput = { aspect?: string; width?: number; height?: number; quality?: string; fps?: number };

async function signedGet(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
  } catch {
    return null;
  }
}

// POST /api/content-studio/render — enqueue a render of the current timeline.
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: { editProjectId?: string | null; clips?: ClipInput[]; output?: OutputInput };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    const clips = Array.isArray(body.clips) ? body.clips : [];
    if (clips.length === 0) return badRequest("No clips to render");
    const out = body.output ?? {};
    const width = Math.max(16, Math.round(out.width ?? 1920));
    const height = Math.max(16, Math.round(out.height ?? 1080));

    // Resolve each clip's source key (proxy preferred) from this org's media assets.
    const ids = [...new Set(clips.map((c) => c.assetId).filter(Boolean))];
    const { data: assets, error: assetErr } = await admin
      .from("content_media_assets")
      .select("id, proxy_key, storage_key, duration_sec")
      .eq("org_id", orgId)
      .in("id", ids);
    if (assetErr) return serverError(assetErr.message);
    const keyOf = new Map((assets ?? []).map((a) => [a.id, a.proxy_key ?? a.storage_key]));

    const manifest = clips.map((c) => {
      const trimIn = Math.max(0, c.trimInSec ?? 0);
      const trimOut = Math.max(trimIn, c.trimOutSec ?? trimIn);
      const speed = Math.max(0.25, Math.min(4, c.speedFactor ?? 1));
      return { assetId: c.assetId, storageKey: keyOf.get(c.assetId) ?? null, trimInSec: trimIn, trimOutSec: trimOut, speedFactor: speed, reversed: !!c.reversed };
    });
    const timelineSec = manifest.reduce((t, m) => t + Math.max(0, m.trimOutSec - m.trimInSec) / m.speedFactor, 0);
    const estimatedCredits = Math.max(1, Math.ceil(timelineSec / 60));
    // First resolvable clip → passthrough preview output while the real FFmpeg
    // concat worker is offline (mock mode), so there's a downloadable artifact.
    const passthroughKey = manifest.find((m) => m.storageKey)?.storageKey ?? null;

    // Assemble + validate the canonical spec (the worker's authoritative input).
    const editProjectId = body.editProjectId ?? null;
    let spec;
    try {
      spec = buildEditSpec({
        editProjectId: editProjectId ?? "scratch",
        orgId,
        clips: manifest,
        output: { width, height, fps: out.fps ?? 30, quality: out.quality ?? "standard" },
      });
    } catch (e) {
      return badRequest(`Invalid edit spec: ${e instanceof Error ? e.message : "validation failed"}`);
    }
    if (spec.timeline.clips.length === 0) return badRequest("No renderable clips (missing source media).");

    const specJson = JSON.stringify(spec);
    const contentHash = createHash("sha256").update(specJson).digest("hex").slice(0, 32);
    const idempotencyKey = createHash("sha256").update(`${orgId}:${contentHash}:render`).digest("hex").slice(0, 40);

    // Freeze the spec snapshot to R2 — the job carries only the key + hash.
    const specSnapshotKey = `orgs/${orgId}/Content Studio/Projects/${editProjectId ?? "scratch"}/spec-${contentHash}.json`;
    try {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: specSnapshotKey, Body: specJson, ContentType: "application/json" }));
    } catch (e) {
      return serverError(`Failed to freeze spec snapshot: ${e instanceof Error ? e.message : "R2 error"}`);
    }

    const { data: job, error: jobErr } = await admin
      .from("content_render_jobs")
      .insert({
        org_id: orgId,
        edit_project_id: editProjectId,
        created_by: user.id,
        job_type: "render",
        status: "queued",
        content_hash: contentHash,
        idempotency_key: idempotencyKey,
        spec_snapshot_key: specSnapshotKey,
        estimated_credits: estimatedCredits,
        input_payload: {
          manifest,
          output: { width, height, aspect: out.aspect ?? "16:9", quality: out.quality ?? "standard", fps: out.fps ?? 30 },
          passthroughKey,
          specSnapshotKey,
          timelineSec,
        },
      })
      .select("id, status")
      .single();
    if (jobErr || !job) return serverError(jobErr?.message ?? "Failed to create render job");

    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      await tasks.trigger("content-studio.render", { jobId: job.id });
    } catch (e) {
      console.warn("[content-studio.render] dispatch skipped:", e instanceof Error ? e.message : e);
    }

    return ok({ jobId: job.id, status: job.status, estimatedCredits, timelineSec });
  });

// GET /api/content-studio/render — recent render jobs + signed download URLs.
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    const { data, error } = await admin
      .from("content_render_jobs")
      .select("id, status, stage, progress_pct, output_storage_key, estimated_credits, error_text, created_at, completed_at, input_payload")
      .eq("org_id", orgId)
      .eq("job_type", "render")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return forbidden(error.message);

    const jobs = await Promise.all(
      (data ?? []).map(async (j) => ({
        id: j.id,
        status: j.status,
        stage: j.stage,
        progressPct: j.progress_pct,
        estimatedCredits: j.estimated_credits,
        errorText: j.error_text,
        createdAt: j.created_at,
        completedAt: j.completed_at,
        aspect: (j.input_payload as { output?: { aspect?: string } } | null)?.output?.aspect ?? null,
        downloadUrl: j.status === "completed" ? await signedGet(j.output_storage_key) : null,
      })),
    );
    return ok({ jobs });
  });
