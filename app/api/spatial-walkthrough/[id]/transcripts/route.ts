import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { canAuthorNarration } from "@/lib/spatial-walkthrough/audio";
import { phrasesFromText, toTranscript } from "@/lib/spatial-walkthrough/transcript";
import { resolveTranscriptProvider } from "@/lib/spatial-walkthrough/transcript-provider";
import { recordSpatialEvent } from "@/lib/spatial-walkthrough/audio-store";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const { data } = await admin.from("spatial_transcripts").select("*").eq("walkthrough_id", id).eq("org_id", orgId);
    return ok({ transcripts: (data ?? []).map((row) => toTranscript(row as Record<string, unknown>)) });
  }, "view");

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canAuthorNarration({ isCeo: access.isCeo, canAuthor: access.canAuthor })) {
      return NextResponse.json({ error: "Transcript authoring is CEO/admin only" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return badRequest("Invalid JSON");
    const segmentId = typeof body.segmentId === "string" ? body.segmentId : null;
    const voiceNoteId = typeof body.voiceNoteId === "string" ? body.voiceNoteId : null;
    if (!segmentId && !voiceNoteId) return badRequest("segmentId or voiceNoteId required");

    let fullText = typeof body.text === "string" ? body.text.trim() : "";
    let provider = "manual";
    let phrases = phrasesFromText(fullText, Number(body.start ?? 0), Number(body.end ?? 1), typeof body.speaker === "string" ? body.speaker : null);

    if (body.transcribe === true) {
      const assetId = typeof body.assetId === "string" ? body.assetId : null;
      if (!assetId) return badRequest("assetId required to transcribe");
      const { data: asset } = await admin.from("spatial_audio_assets").select("*").eq("id", assetId).eq("walkthrough_id", id).maybeSingle();
      if (!asset?.storage_key) return notFound("audio asset not found");
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: asset.storage_key }));
      const buf = await obj.Body?.transformToByteArray();
      if (!buf) return serverError("audio empty");
      const blob = new Blob([Buffer.from(buf)], { type: asset.mime || "audio/webm" });
      const stt = resolveTranscriptProvider();
      try {
        const job = await stt.transcribe(blob, "narration.webm", {
          start: Number(body.start ?? 0),
          end: Number(body.end ?? 1),
          speaker: typeof body.speaker === "string" ? body.speaker : null,
        });
        fullText = job.text;
        phrases = job.phrases;
        provider = job.provider;
      } catch (err) {
        if (err instanceof Error && err.message === "manual-transcript") {
          return badRequest("SPATIAL_STT_PROVIDER=manual; paste text instead");
        }
        throw err;
      }
    }

    const { data, error } = await admin.from("spatial_transcripts").insert({
      org_id: orgId,
      walkthrough_id: id,
      narration_segment_id: segmentId,
      voice_note_id: voiceNoteId,
      provider,
      language: typeof body.language === "string" ? body.language : "en",
      full_text: fullText,
      phrases,
      words: null,
      status: "ready",
    }).select("*").single();
    if (error) return serverError(error.message);
    if (segmentId) {
      await admin.from("spatial_narration_segments").update({
        transcript_status: provider === "manual" ? "manual" : "ready",
      }).eq("id", segmentId);
    }
    await recordSpatialEvent(admin, {
      orgId,
      walkthroughId: id,
      kind: provider === "manual" ? "transcript.manual" : "transcript.ready",
      payload: { transcriptId: data.id, provider },
    });
    return ok({ transcript: toTranscript(data as Record<string, unknown>) }, 201);
  }, "author");
