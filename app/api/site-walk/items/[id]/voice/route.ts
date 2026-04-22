/**
 * POST /api/site-walk/items/[id]/voice
 *
 * Upload the raw audio blob for a voice_note item. Saves the blob to S3 and
 * stores the key on `site_walk_items.audio_s3_key`. Used by the offline-first
 * voice capture flow when MediaRecorder produced a Blob.
 *
 * Body: multipart/form-data with `audio` (Blob, ≤25 MB).
 * Response: { audio_s3_key }
 *
 * NOTE: this is separate from /api/site-walk/notes/transcribe, which calls
 * Groq Whisper. This route just stores the binary so the audio is replayable
 * and archivable — transcription happens via the other route.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { uploadBuffer } from "@/lib/s3-utils";
import type { IdRouteContext } from "@/lib/types/api";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]);

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization required");
    const { id } = await ctx.params;

    const { data: item, error: itemErr } = await admin
      .from("site_walk_items")
      .select("id, item_type")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (itemErr) return serverError(itemErr.message);
    if (!item) return notFound("Item not found");

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
    // Loose check — browsers report mime inconsistently, so accept any audio/*
    // OR explicit allowed list match.
    const mime = audio.type || "audio/webm";
    if (!mime.startsWith("audio/") && !ALLOWED.has(mime)) {
      return badRequest(`unsupported audio type: ${mime}`);
    }

    const ext =
      mime.includes("webm") ? "webm" :
      mime.includes("mp4")  ? "m4a"  :
      mime.includes("ogg")  ? "ogg"  :
      mime.includes("wav")  ? "wav"  :
      mime.includes("mpeg") ? "mp3"  : "webm";

    const s3Key = `site-walk/audio/${orgId}/${id}-${Date.now()}.${ext}`;

    try {
      const buffer = Buffer.from(await audio.arrayBuffer());
      await uploadBuffer(s3Key, buffer, mime);

      const { error: updateErr } = await admin
        .from("site_walk_items")
        .update({ audio_s3_key: s3Key })
        .eq("id", id)
        .eq("org_id", orgId);

      if (updateErr) return serverError(updateErr.message);

      // TODO PR #28b: bridge audio into SlateDrop (project Photos folder
      // currently doesn't host audio; needs an Audio folder convention first).
      return ok({ audio_s3_key: s3Key });
    } catch (err) {
      console.error("[voice-upload]", err);
      return serverError("Failed to upload audio");
    }
  });

export const runtime = "nodejs";
