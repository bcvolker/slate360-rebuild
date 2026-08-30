import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { canAuthorNarration } from "@/lib/spatial-walkthrough/audio";
import { assertDerivativeAudioKey, audioObjectKey, extFromMime, recordSpatialEvent } from "@/lib/spatial-walkthrough/audio-store";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canAuthorNarration({ isCeo: access.isCeo, canAuthor: access.canAuthor })) {
      return NextResponse.json({ error: "Voice note authoring is CEO/admin only" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const { data: wt } = await admin.from("spatial_walkthroughs").select("id, project_id").eq("id", id).eq("org_id", orgId).maybeSingle();
    if (!wt) return notFound("Walkthrough not found");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("file required");
    const { data: pin, error: pinErr } = await admin.from("spatial_pins").insert({
      org_id: orgId,
      project_id: wt.project_id,
      walkthrough_id: id,
      clip_id: String(form.get("clipId") ?? "") || null,
      created_by: user.id,
      label: String(form.get("label") ?? "Voice note"),
      pin_type: "voice",
      body: typeof form.get("body") === "string" ? String(form.get("body")) : "Field voice note",
      t_seconds: Number(form.get("tSeconds") ?? 0),
      yaw_deg: Number(form.get("yawDeg") ?? 0),
      pitch_deg: Number(form.get("pitchDeg") ?? 0),
      visibility: "client",
    }).select("*").single();
    if (pinErr || !pin) return serverError(pinErr?.message ?? "pin failed");
    const bytes = Buffer.from(await file.arrayBuffer());
    const assetId = randomUUID();
    const key = audioObjectKey(orgId, id, assetId, extFromMime(file.type));
    if (!assertDerivativeAudioKey(key)) return serverError("refusing non-derivative audio key");
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: file.type || "audio/webm" }));
    const { data: asset, error: assetErr } = await admin.from("spatial_audio_assets").insert({
      id: assetId,
      org_id: orgId,
      walkthrough_id: id,
      kind: "voice_note",
      storage_key: key,
      mime: file.type || "audio/webm",
      bytes: bytes.byteLength,
    }).select("*").single();
    if (assetErr || !asset) return serverError(assetErr?.message ?? "asset failed");
    const { data: note, error } = await admin.from("spatial_voice_notes").insert({
      org_id: orgId,
      walkthrough_id: id,
      pin_id: pin.id,
      asset_id: asset.id,
      transcript_status: "none",
    }).select("*").single();
    if (error) return serverError(error.message);
    await recordSpatialEvent(admin, {
      orgId,
      walkthroughId: id,
      kind: "voice_note.played",
      tSeconds: Number(form.get("tSeconds") ?? 0),
      payload: { created: true, pinId: pin.id, noteId: note.id },
    });
    return ok({ pin, note }, 201);
  }, "author");
