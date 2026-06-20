import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

// POST /api/content-studio/media/ingest — register an uploaded clip + enqueue proxy ingest.
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: { editProjectId?: string | null; storageKey?: string; filename?: string; kind?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    const storageKey = (body.storageKey ?? "").trim();
    if (!storageKey) return badRequest("storageKey required");
    const kind = body.kind === "image" || body.kind === "equirect_video" || body.kind === "audio" ? body.kind : "video";
    const editProjectId = body.editProjectId ?? null;

    const { data: asset, error: assetErr } = await admin
      .from("content_media_assets")
      .insert({
        org_id: orgId,
        edit_project_id: editProjectId,
        created_by: user.id,
        kind,
        original_filename: body.filename ?? null,
        storage_key: storageKey,
        status: "processing",
      })
      .select("id, org_id, edit_project_id, kind, original_filename, storage_key, status, created_at")
      .single();
    if (assetErr || !asset) return serverError(assetErr?.message ?? "Failed to create asset");

    const { data: job, error: jobErr } = await admin
      .from("content_render_jobs")
      .insert({
        org_id: orgId,
        edit_project_id: editProjectId,
        created_by: user.id,
        job_type: "ingest",
        status: "queued",
        input_payload: { mediaAssetId: asset.id, storageKey, kind },
      })
      .select("id")
      .single();
    if (jobErr || !job) return serverError(jobErr?.message ?? "Failed to create ingest job");

    await admin.from("content_media_assets").update({ ingest_job_id: job.id }).eq("id", asset.id);

    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      await tasks.trigger("content-studio.ingest", { jobId: job.id });
    } catch (e) {
      console.warn("[content-studio.ingest] dispatch skipped:", e instanceof Error ? e.message : e);
    }

    return ok({ asset, jobId: job.id });
  });
