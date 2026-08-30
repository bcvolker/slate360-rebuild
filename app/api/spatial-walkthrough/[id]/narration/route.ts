import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { canAuthorNarration, toNarrationSegment } from "@/lib/spatial-walkthrough/audio";
import { assertDerivativeAudioKey, audioObjectKey, extFromMime, recordSpatialEvent } from "@/lib/spatial-walkthrough/audio-store";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const [{ data: segments }, { data: assets }] = await Promise.all([
      admin.from("spatial_narration_segments").select("*").eq("walkthrough_id", id).eq("org_id", orgId).order("start_time"),
      admin.from("spatial_audio_assets").select("*").eq("walkthrough_id", id).eq("kind", "narration"),
    ]);
    const list = (segments ?? []).map((row) => {
      const seg = toNarrationSegment(row as Record<string, unknown>);
      const asset = (assets ?? []).find((a) => a.id === seg.assetId);
      if (asset) {
        seg.asset = {
          id: asset.id,
          kind: "narration",
          storageKey: asset.storage_key,
          mime: asset.mime,
          durationS: asset.duration_s,
          trimStartS: Number(asset.trim_start_s ?? 0),
          trimEndS: asset.trim_end_s,
          url: `/api/spatial-walkthrough/${id}/audio?asset=${asset.id}`,
        };
      }
      return seg;
    });
    return ok({ segments: list });
  }, "view");

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canAuthorNarration({ isCeo: access.isCeo, canAuthor: access.canAuthor })) {
      return NextResponse.json({ error: "Narration authoring is CEO/admin only" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const form = await req.formData();
    const clipId = String(form.get("clipId") ?? "");
    const file = form.get("file");
    if (!clipId || !(file instanceof File)) return badRequest("clipId and file required");
    const { data: clip } = await admin.from("spatial_clips").select("id").eq("id", clipId).eq("walkthrough_id", id).maybeSingle();
    if (!clip) return notFound("Clip not found");
    const startTime = Number(form.get("startTime") ?? 0);
    const endTime = Number(form.get("endTime") ?? startTime + 8);
    if (!(endTime > startTime)) return badRequest("endTime must be after startTime");
    const bytes = Buffer.from(await file.arrayBuffer());
    const assetId = randomUUID();
    const key = audioObjectKey(orgId, id, assetId, extFromMime(file.type));
    if (!assertDerivativeAudioKey(key)) return serverError("refusing non-derivative audio key");
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: file.type || "audio/webm" }));
    const { data: assetRow, error: assetErr } = await admin.from("spatial_audio_assets").insert({
      id: assetId,
      org_id: orgId,
      walkthrough_id: id,
      kind: "narration",
      storage_key: key,
      mime: file.type || "audio/webm",
      bytes: bytes.byteLength,
      duration_s: endTime - startTime,
    }).select("*").single();
    if (assetErr || !assetRow) return serverError(assetErr?.message ?? "asset failed");
    const source = form.get("source") === "record" || form.get("source") === "replace" ? String(form.get("source")) : "upload";
    const { data: segment, error } = await admin.from("spatial_narration_segments").insert({
      org_id: orgId,
      walkthrough_id: id,
      clip_id: clipId,
      chapter_id: form.get("chapterId") ? String(form.get("chapterId")) : null,
      asset_id: assetRow.id,
      start_time: startTime,
      end_time: endTime,
      title: String(form.get("title") ?? "Narration"),
      speaker: String(form.get("speaker") ?? "Guide"),
      volume: Number(form.get("volume") ?? 1),
      source,
      transcript_status: "none",
    }).select("*").single();
    if (error) return serverError(error.message);
    await recordSpatialEvent(admin, {
      orgId,
      walkthroughId: id,
      kind: source === "record" ? "narration.recorded" : "narration.uploaded",
      tSeconds: startTime,
      payload: { segmentId: segment.id },
    });
    return ok({ segment: toNarrationSegment(segment as Record<string, unknown>) }, 201);
  }, "author");
