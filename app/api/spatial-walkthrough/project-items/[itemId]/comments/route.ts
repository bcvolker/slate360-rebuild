import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, forbidden, serverError } from "@/lib/server/api-response";
import { canCommentOnItem, itemAccessDenied } from "@/lib/spatial-walkthrough/project-items";
import { emitItemEvent, loadItemRow } from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";
import { assertDerivativeAudioKey, audioObjectKey, extFromMime } from "@/lib/spatial-walkthrough/audio-store";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ itemId: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    const { itemId } = await ctx.params;
    const loaded = await loadItemRow(admin, { orgId, itemId });
    if (!loaded || itemAccessDenied(loaded.item, access.canView ? "contractor" : "client", user.id)) {
      return notFound("Item not found");
    }
    if (!canCommentOnItem({ audience: access.canView ? "contractor" : "client", canAuthor: access.canAuthor })) {
      return forbidden("Commenting is not allowed");
    }
    const contentType = req.headers.get("content-type") ?? "";
    let text = "";
    let fileDocumentId: string | null = null;
    let voiceAssetId: string | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      text = String(form.get("text") ?? "").trim();
      fileDocumentId = typeof form.get("fileDocumentId") === "string" ? String(form.get("fileDocumentId")) : null;
      const file = form.get("voice");
      if (file instanceof File) {
        const loc = loaded.item.locators[0];
        const walkthroughId = loc?.walkthroughId;
        if (!walkthroughId) return badRequest("voice comments need a walkthrough locator");
        const bytes = Buffer.from(await file.arrayBuffer());
        const assetId = randomUUID();
        const key = audioObjectKey(orgId, walkthroughId, assetId, extFromMime(file.type));
        if (!assertDerivativeAudioKey(key)) return serverError("refusing non-derivative audio key");
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: file.type || "audio/webm" }));
        const { data: asset, error: assetErr } = await admin.from("spatial_audio_assets").insert({
          id: assetId,
          org_id: orgId,
          walkthrough_id: walkthroughId,
          kind: "item_comment",
          storage_key: key,
          mime: file.type || "audio/webm",
          bytes: bytes.byteLength,
        }).select("id").single();
        if (assetErr || !asset) return serverError(assetErr?.message ?? "asset failed");
        voiceAssetId = asset.id;
      }
    } else {
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      text = typeof body?.text === "string" ? body.text.trim() : "";
      fileDocumentId = typeof body?.fileDocumentId === "string" ? body.fileDocumentId : null;
    }
    if (!text && !voiceAssetId && !fileDocumentId) return badRequest("text, voice, or file required");
    const { data: comment, error } = await admin.from("spatial_project_item_comments").insert({
      org_id: orgId,
      item_id: itemId,
      author_id: user.id,
      body: text,
      voice_asset_id: voiceAssetId,
      file_document_id: fileDocumentId,
    }).select("*").single();
    if (error || !comment) return serverError(error?.message ?? "comment failed");
    await emitItemEvent(admin, { orgId, event: makeItemEvent("commented", itemId, loaded.item.projectId, user.id, { commentId: comment.id }) });
    return ok({ comment }, 201);
  });
