import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { transcribeAudio } from "@/lib/server/ai-provider";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Groq + OpenAI both cap at 25 MB

/**
 * POST /api/site-walk/notes/transcribe
 * Body: multipart/form-data with `audio` (Blob) — webm/ogg/mp4/wav.
 * Response: { transcript: string }
 *
 * Used by the offline-fallback queue: capture audio in the field, upload when
 * connection returns.
 */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return badRequest("multipart/form-data required");
    }

    const audio = form.get("audio");
    if (!(audio instanceof Blob)) return badRequest("audio file is required");
    if (audio.size === 0) return badRequest("audio file is empty");
    if (audio.size > MAX_AUDIO_BYTES) {
      return badRequest(`audio must be ≤ ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB`);
    }

    const filenameRaw = form.get("filename");
    const filename =
      typeof filenameRaw === "string" && filenameRaw.length > 0 ? filenameRaw : "note.webm";

    try {
      const transcript = await transcribeAudio(audio, filename);
      console.info(
        `[notes-transcribe] org=${orgId} user=${user.id} bytes=${audio.size} chars=${transcript.length}`,
      );
      return ok({ transcript });
    } catch (err) {
      console.error("[notes-transcribe]", err);
      const msg = err instanceof Error ? err.message : "transcribe failed";
      if (msg === "no-stt-provider") {
        return serverError("Speech-to-text provider not configured");
      }
      return serverError("Failed to transcribe audio");
    }
  });

// Form-data routes need the Node runtime
export const runtime = "nodejs";
