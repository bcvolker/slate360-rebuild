/**
 * POST /api/site-walk/transcribe
 *
 * Transcribe a previously-uploaded voice_note item via Whisper
 * (Groq preferred, OpenAI fallback — see lib/server/ai-provider.ts).
 *
 * This is the **post-upload** transcription path. The two-step model:
 *   1. Field user records voice → /api/site-walk/items/[id]/voice stores the
 *      raw audio in S3 and writes `audio_s3_key` on the item.
 *   2. Later (online), client/job calls THIS route with `{ item_id }`. We
 *      fetch the audio from S3, run Whisper, and persist the transcript on
 *      `site_walk_items.metadata.transcript` so it shows in the viewer / PDF.
 *
 * Body: { item_id: string }
 * Response: { transcript: string, item_id: string }
 *
 * Limits:
 *   - 25 MB hard cap (Whisper API limit, both Groq + OpenAI).
 *   - Org-scoped: caller must be a member of the item's org.
 *   - Idempotent for the caller — returns the existing transcript without
 *     re-charging Whisper if `metadata.transcript` is already set, unless
 *     `?force=1` is passed in the query string.
 */
import { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { transcribeAudio } from "@/lib/server/ai-provider";
import {
  checkAICreditLimit,
  meteringBlockedResponse,
  recordSiteWalkUsage,
} from "@/lib/site-walk/metering";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

interface ItemRow {
  id: string;
  project_id: string | null;
  session_id: string | null;
  audio_s3_key: string | null;
  metadata: Record<string, unknown> | null;
}

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId, user }) => {
    if (!orgId) return badRequest("Organization required");

    const body = (await req.json().catch(() => ({}))) as { item_id?: string };
    if (!body.item_id || typeof body.item_id !== "string") {
      return badRequest("item_id is required");
    }
    const force = req.nextUrl.searchParams.get("force") === "1";

    const { data: item, error: itemErr } = await admin
      .from("site_walk_items")
      .select("id, project_id, session_id, audio_s3_key, metadata")
      .eq("id", body.item_id)
      .eq("org_id", orgId)
      .maybeSingle<ItemRow>();

    if (itemErr) return serverError(itemErr.message);
    if (!item) return notFound("Item not found");
    if (!item.audio_s3_key) {
      return badRequest("Item has no audio to transcribe");
    }

    // Short-circuit when transcript already exists.
    const existing =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>).transcript
        : undefined;
    if (!force && typeof existing === "string" && existing.length > 0) {
      return ok({ transcript: existing, item_id: item.id, cached: true });
    }

    // Fetch audio bytes from S3 with a hard size guard.
    let audioBuffer: Buffer;
    let contentType = "audio/webm";
    try {
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: item.audio_s3_key }),
      );
      const sizeHeader =
        typeof obj.ContentLength === "number" ? obj.ContentLength : 0;
      if (sizeHeader > MAX_AUDIO_BYTES) {
        return badRequest(
          `audio must be ≤ ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB`,
        );
      }
      if (obj.ContentType) contentType = obj.ContentType;
      const stream = obj.Body as
        | { transformToByteArray?: () => Promise<Uint8Array> }
        | undefined;
      if (!stream || typeof stream.transformToByteArray !== "function") {
        return serverError("Failed to read audio from storage");
      }
      const bytes = await stream.transformToByteArray();
      if (bytes.byteLength > MAX_AUDIO_BYTES) {
        return badRequest(
          `audio must be ≤ ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB`,
        );
      }
      audioBuffer = Buffer.from(bytes);
    } catch (err) {
      console.error("[site-walk-transcribe] s3 fetch failed", err);
      return serverError("Failed to load audio from storage");
    }

    const creditCost = Math.max(1, Math.ceil(audioBuffer.byteLength / (5 * 1024 * 1024)));
    const creditCheck = await checkAICreditLimit(admin, orgId, creditCost);
    const blocked = meteringBlockedResponse(creditCheck);
    if (blocked) return blocked;

    // Run Whisper.
    let transcript: string;
    try {
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: contentType });
      const filename = item.audio_s3_key.split("/").pop() ?? "audio.webm";
      transcript = await transcribeAudio(blob, filename);
    } catch (err) {
      console.error("[site-walk-transcribe] whisper failed", err);
      const msg = err instanceof Error ? err.message : "transcribe failed";
      if (msg === "no-stt-provider") {
        return serverError(
          "Voice transcription is not yet enabled for this environment.",
        );
      }
      return serverError("Failed to transcribe audio");
    }

    // Persist on metadata.transcript (preserving any other metadata fields).
    const nextMetadata = {
      ...(item.metadata && typeof item.metadata === "object" ? item.metadata : {}),
      transcript,
      transcribed_at: new Date().toISOString(),
      transcribed_by: user.id,
    };

    const { error: updateErr } = await admin
      .from("site_walk_items")
      .update({ metadata: nextMetadata })
      .eq("id", item.id)
      .eq("org_id", orgId);

    if (updateErr) {
      console.error("[site-walk-transcribe] update failed", updateErr);
      return serverError("Transcribed audio but failed to save transcript");
    }

    await recordSiteWalkUsage(admin, {
      orgId,
      projectId: item.project_id,
      sessionId: item.session_id,
      eventType: "ai_credits_used",
      quantity: creditCost,
      unit: "credits",
      sourceTable: "site_walk_items",
      sourceId: item.id,
      metadata: { bytes: audioBuffer.byteLength, forced: force },
    });

    console.info(
      `[site-walk-transcribe] org=${orgId} user=${user.id} item=${item.id} bytes=${audioBuffer.byteLength} chars=${transcript.length}`,
    );
    return ok({ transcript, item_id: item.id, cached: false });
  });

// S3 + Whisper need the Node runtime
export const runtime = "nodejs";
