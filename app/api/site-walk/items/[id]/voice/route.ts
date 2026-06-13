/**
 * POST /api/site-walk/items/[id]/voice
 *
 * Upload the raw audio blob for a voice_note item. Saves the blob to S3 and
 * stores the key on `site_walk_items.audio_s3_key`. Used by the offline-first
 * voice capture flow when MediaRecorder produced a Blob.
 */
import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { buildCanonicalAssetFilename, extensionFromMime } from "@/lib/slatedrop/canonical-filename";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";
import type { IdRouteContext } from "@/lib/types/api";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { ensureSiteWalkProjectFolder } from "@/lib/site-walk/slatedrop-folders";
import { bridgeVoiceMemoToSlateDrop } from "@/lib/site-walk/slatedrop-bridge";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]);

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId, user }) => {
    if (!orgId) return badRequest("Organization required");
    const { id } = await ctx.params;

    let itemQuery = admin
      .from("site_walk_items")
      .select("id, item_type, session_id, project_id")
      .eq("id", id)
      .eq("org_id", orgId);
    itemQuery = excludeDeletedSiteWalkItems(itemQuery);

    const { data: item, error: itemErr } = await itemQuery.maybeSingle();

    if (itemErr) return serverError(itemErr.message);
    if (!item) return notFound("Item not found");

    let projectId = item.project_id as string | null;
    if (!projectId && item.session_id) {
      const { data: session } = await admin
        .from("site_walk_sessions")
        .select("project_id")
        .eq("id", item.session_id)
        .eq("org_id", orgId)
        .maybeSingle();
      projectId = session?.project_id ?? null;
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return badRequest("multipart/form-data required");
    }

    const audio = form.get("audio");
    if (!(audio instanceof Blob)) return badRequest("audio file is required");
    if (audio.size === 0) return badRequest("audio file is empty");
    if (audio.size > MAX_BYTES) {
      return badRequest(`audio must be ≤ ${Math.round(MAX_BYTES / 1024 / 1024)}MB`);
    }

    const mime = audio.type || "audio/webm";
    if (!mime.startsWith("audio/") && !ALLOWED.has(mime)) {
      return badRequest(`unsupported audio type: ${mime}`);
    }

    const ext = extensionFromMime(mime, "webm");
    const canonicalFilename = buildCanonicalAssetFilename({
      type: "VoiceMemo",
      id: id,
      ext,
    });

    let s3Key: string;
    if (projectId) {
      try {
        const folderId = await ensureSiteWalkProjectFolder({
          admin,
          projectId,
          orgId,
          userId: user.id,
          childName: "Voice_Memos",
        });
        if (folderId) {
          const namespace = resolveNamespace(orgId, user.id);
          s3Key = buildCanonicalS3Key(namespace, folderId, canonicalFilename);
        } else {
          s3Key = `site-walk/audio/${orgId}/${canonicalFilename}`;
        }
      } catch {
        s3Key = `site-walk/audio/${orgId}/${canonicalFilename}`;
      }
    } else {
      s3Key = `site-walk/audio/${orgId}/${canonicalFilename}`;
    }

    try {
      const buffer = Buffer.from(await audio.arrayBuffer());
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          Body: buffer,
          ContentType: mime,
        }),
      );

      const { error: updateErr } = await admin
        .from("site_walk_items")
        .update({ audio_s3_key: s3Key })
        .eq("id", id)
        .eq("org_id", orgId);

      if (updateErr) return serverError(updateErr.message);

      if (projectId) {
        await bridgeVoiceMemoToSlateDrop(admin, {
          itemId: id,
          s3Key,
          fileName: canonicalFilename,
          fileType: ext,
          fileSize: audio.size,
          projectId,
          orgId,
          userId: user.id,
        });
      }

      return ok({ audio_s3_key: s3Key });
    } catch (err) {
      console.error("[voice-upload]", err);
      return serverError("Failed to upload audio");
    }
  });

export const runtime = "nodejs";
