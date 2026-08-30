import { NextRequest } from "next/server";
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { tasks } from "@trigger.dev/sdk/v3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { validateWalkthroughUpload } from "@/lib/spatial-walkthrough/policy";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const PART_BYTES = 8 * 1024 * 1024;

function requestBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  if (host) return `${proto}://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://www.slate360.ai").replace(/\/$/, "");
}

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const action = req.nextUrl.searchParams.get("action") ?? "init";
    const { data: wt } = await admin
      .from("spatial_walkthroughs")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!wt) return notFound("Walkthrough not found");

    if (action === "init") {
      const body = (await req.json().catch(() => null)) as {
        filename?: string; contentType?: string; size?: number; width?: number; height?: number; title?: string;
      } | null;
      const check = validateWalkthroughUpload({
        filename: body?.filename ?? "",
        contentType: body?.contentType ?? "",
        size: body?.size ?? 0,
        width: body?.width,
        height: body?.height,
      });
      if (!check.ok) return badRequest(check.error);
      const totalParts = Math.max(1, Math.ceil((body?.size ?? 1) / PART_BYTES));
      const clipId = crypto.randomUUID();
      const key = `orgs/${orgId}/spatial-walkthrough/${clipId}/master.mp4`;
      const created = await s3.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET, Key: key, ContentType: body?.contentType || "video/mp4",
      }));
      if (!created.UploadId) return serverError("Failed to start upload");
      const { data: clip, error } = await admin.from("spatial_clips").insert({
        id: clipId,
        org_id: orgId,
        walkthrough_id: id,
        title: body?.title || body?.filename,
        master_key: key,
        master_bytes: body?.size,
        status: "uploading",
        upload_session: { s3UploadId: created.UploadId, totalParts, key },
      }).select("*").single();
      if (error) return serverError(error.message);
      await admin.from("spatial_walkthroughs").update({ status: "processing" }).eq("id", id);
      return ok({ clip, key, uploadId: created.UploadId, totalParts, partBytes: PART_BYTES });
    }

    if (action === "sign") {
      const body = (await req.json().catch(() => null)) as { clipId?: string; partNumbers?: number[] } | null;
      if (!body?.clipId || !body.partNumbers?.length) return badRequest("clipId and partNumbers required");
      const { data: clip } = await admin.from("spatial_clips").select("upload_session, master_key").eq("id", body.clipId).eq("org_id", orgId).maybeSingle();
      const session = (clip?.upload_session ?? {}) as { s3UploadId?: string };
      if (!clip?.master_key || !session.s3UploadId) return badRequest("No upload session");
      const parts = await Promise.all(body.partNumbers.map(async (partNumber) => ({
        partNumber,
        signedUrl: await getSignedUrl(s3, new UploadPartCommand({
          Bucket: BUCKET, Key: clip.master_key, UploadId: session.s3UploadId, PartNumber: partNumber,
        }), { expiresIn: 3600 }),
      })));
      return ok({ parts });
    }

    if (action === "complete") {
      const body = (await req.json().catch(() => null)) as {
        clipId?: string; parts?: Array<{ partNumber: number; etag: string }>;
      } | null;
      if (!body?.clipId || !body.parts?.length) return badRequest("clipId and parts required");
      const { data: clip } = await admin.from("spatial_clips").select("*").eq("id", body.clipId).eq("org_id", orgId).maybeSingle();
      if (!clip) return notFound("Clip not found");
      const session = (clip.upload_session ?? {}) as { s3UploadId?: string };
      if (!session.s3UploadId) return badRequest("No upload session");
      await s3.send(new CompleteMultipartUploadCommand({
        Bucket: BUCKET, Key: clip.master_key, UploadId: session.s3UploadId,
        MultipartUpload: {
          Parts: [...body.parts].sort((a, b) => a.partNumber - b.partNumber).map((p) => ({
            ETag: p.etag.replace(/^"|"$/g, ""), PartNumber: p.partNumber,
          })),
        },
      }));
      const { data: job, error: jobErr } = await admin.from("spatial_processing_jobs").insert({
        org_id: orgId, walkthrough_id: id, clip_id: clip.id, job_type: "ingest",
        status: "queued", source_s3_key: clip.master_key,
      }).select("id").single();
      if (jobErr) return serverError(jobErr.message);
      await admin.from("spatial_clips").update({ status: "processing", upload_session: {} }).eq("id", clip.id);
      const callbackBaseUrl = requestBaseUrl(req);
      const modalBody = {
        jobId: job.id,
        clipId: clip.id,
        orgId,
        sourceKey: clip.master_key,
        callbackBaseUrl,
      };
      let dispatched: "trigger" | "modal" = "trigger";
      try {
        await tasks.trigger("spatial-walkthrough.ingest", { jobId: job.id, callbackBaseUrl });
      } catch {
        const endpoint = process.env.MODAL_SPATIAL_WALKTHROUGH_ENDPOINT?.trim();
        if (!endpoint) {
          return serverError("Ingest dispatch failed and MODAL_SPATIAL_WALKTHROUGH_ENDPOINT is not configured");
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modalBody),
        });
        if (!res.ok) {
          const detail = (await res.text().catch(() => "")).slice(0, 400);
          await admin.from("spatial_processing_jobs").update({
            status: "failed",
            error_log: `Modal dispatch ${res.status}: ${detail}`,
          }).eq("id", job.id);
          return serverError(`Modal dispatch ${res.status}`);
        }
        dispatched = "modal";
        const runId = res.headers.get("x-modal-run-id");
        if (runId) {
          await admin.from("spatial_processing_jobs").update({
            status: "processing",
            stage: "dispatch",
            worker_run_id: runId,
          }).eq("id", job.id);
        }
      }
      return ok({ clipId: clip.id, jobId: job.id, ingestQueued: true, dispatched });
    }

    return badRequest("Unknown action");
  }, "author");
