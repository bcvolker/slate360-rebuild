import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { created, badRequest } from "@/lib/server/api-response";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { emitItemEvent, insertLocator } from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";
import { locatorFromBody, mintGuestKey, readGuestKey, resolveShareAudience, GUEST_COOKIE } from "@/lib/spatial-walkthrough/item-public-access";
import { clientMayAttach, isProjectDocumentType } from "@/lib/spatial-walkthrough/project-documents";
import { assertDerivativeAudioKey, audioObjectKey, extFromMime } from "@/lib/spatial-walkthrough/audio-store";
import { s3, BUCKET } from "@/lib/s3";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

const checkRateLimit = createRateLimiter("spatial-walkthrough:public-ask", 20, 60);

export const POST = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const share = await resolveShareAudience(req, token);
  if (!share.ok) return NextResponse.json(publicShareDenial(), { status: 404 });
  const { data: wt } = await share.admin.from("spatial_walkthroughs").select("id, project_id, org_id").eq("id", share.row.walkthrough_id).maybeSingle();
  if (!wt) return NextResponse.json(publicShareDenial(), { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let title = "";
  let description = "";
  let loc: ReturnType<typeof locatorFromBody> | null = null;
  let documentId: string | null = null;
  let voice: File | null = null;
  let attachType = "other";
  let attachTitle = "";
  let attachUrl: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") ?? form.get("text") ?? "").trim();
    description = String(form.get("description") ?? "").trim();
    loc = locatorFromBody({
      clipId: String(form.get("clipId") ?? ""),
      chapterId: String(form.get("chapterId") ?? ""),
      tSeconds: Number(form.get("tSeconds") ?? form.get("t")),
      yawDeg: Number(form.get("yawDeg") ?? form.get("yaw")),
      pitchDeg: Number(form.get("pitchDeg") ?? form.get("pitch")),
    }, wt.id);
    const file = form.get("voice");
    if (file instanceof File) voice = file;
    attachType = String(form.get("fileType") ?? "other");
    attachTitle = String(form.get("fileTitle") ?? "");
    attachUrl = typeof form.get("fileUrl") === "string" ? String(form.get("fileUrl")) : null;
  } else {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return badRequest("body required");
    title = typeof body.title === "string" ? body.title.trim() : typeof body.text === "string" ? body.text.trim() : "";
    description = typeof body.description === "string" ? body.description : "";
    loc = locatorFromBody(body, wt.id);
    if (typeof body.fileDocumentId === "string") documentId = body.fileDocumentId;
    if (typeof body.fileUrl === "string") attachUrl = body.fileUrl;
    if (typeof body.fileType === "string") attachType = body.fileType;
    if (typeof body.fileTitle === "string") attachTitle = body.fileTitle;
  }
  if (!title) return badRequest("question required");
  const guest = (await readGuestKey()) || mintGuestKey();

  const { data: item, error } = await share.admin.from("spatial_project_items").insert({
    org_id: wt.org_id,
    project_id: wt.project_id,
    type: "question",
    title,
    description: description || null,
    status: "open",
    created_by: null,
    guest_key: guest,
    visibility: "client",
  }).select("*").single();
  if (error || !item) return NextResponse.json(publicShareDenial(), { status: 404 });
  if (loc) await insertLocator(share.admin, wt.org_id, item.id, loc);

  if (voice) {
    const bytes = Buffer.from(await voice.arrayBuffer());
    const assetId = randomUUID();
    const key = audioObjectKey(wt.org_id, wt.id, assetId, extFromMime(voice.type));
    if (assertDerivativeAudioKey(key)) {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: voice.type || "audio/webm" }));
      const { data: asset } = await share.admin.from("spatial_audio_assets").insert({
        id: assetId,
        org_id: wt.org_id,
        walkthrough_id: wt.id,
        kind: "item_comment",
        storage_key: key,
        mime: voice.type || "audio/webm",
        bytes: bytes.byteLength,
      }).select("id").single();
      if (asset) {
        await share.admin.from("spatial_project_item_comments").insert({
          org_id: wt.org_id,
          item_id: item.id,
          body: title,
          voice_asset_id: asset.id,
        });
      }
    }
  }

  if (!documentId && attachUrl && clientMayAttach(isProjectDocumentType(attachType) ? attachType as never : "other")) {
    const { data: doc } = await share.admin.from("spatial_project_documents").insert({
      org_id: wt.org_id,
      project_id: wt.project_id,
      type: isProjectDocumentType(attachType) ? attachType : "other",
      title: attachTitle || title,
      source_provider: "url",
      source_url: attachUrl,
    }).select("id").single();
    documentId = doc?.id ?? null;
  }
  if (documentId) {
    await share.admin.from("spatial_project_item_files").upsert({
      org_id: wt.org_id,
      item_id: item.id,
      document_id: documentId,
    });
  }

  await emitItemEvent(share.admin, {
    orgId: wt.org_id,
    event: makeItemEvent("created", item.id, wt.project_id, null, { source: "ask" }, wt.id),
  });

  const res = created({ item: { id: item.id, title: item.title, status: item.status } });
  res.cookies.set(GUEST_COOKIE, guest, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
};
