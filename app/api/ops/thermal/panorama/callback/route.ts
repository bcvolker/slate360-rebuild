import { NextRequest } from "next/server";
import { unauthorized, badRequest, serverError, ok } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";

export const runtime = "nodejs";

type NewCapture = {
  id: string;
  filename: string;
  npzDataPath: string;
  previewPath: string;
  storagePath: string;
  minC: number;
  maxC: number;
  sourceCaptureIds: string[];
  sourceFilenames: string[];
};
type Body = {
  sessionId: string;
  requestIndex?: number;
  status: "completed" | "failed";
  capture?: NewCapture;
  errorLog?: string;
};

/**
 * Modal panorama-stitch callback (PAN). On success, inserts the stitched
 * result as a NEW `thermal_captures` row — flagged `metadata.panorama: true`
 * (doc: "one NPZ + capture row flagged panorama:true") — so it's just
 * another capture the existing grid route/Analyze/Export/Report machinery
 * already reads, no new viewer needed. Marks the session's panorama request
 * done, same `panorama_requests` array pattern the Motion timelapse callback
 * uses for `motion_requests`.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) return serverError("Worker callback not configured");

  const rawBody = await req.text();
  if (!verifyWorkerSignature(rawBody, req.headers.get("x-worker-signature"), secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: Body;
  try {
    body = JSON.parse(rawBody) as Body;
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.sessionId) return badRequest("sessionId is required");

  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("thermal_analysis_sessions")
    .select("id, org_id, metadata")
    .eq("id", body.sessionId)
    .maybeSingle();
  if (error) return serverError(error.message);
  if (!session) return badRequest("Session not found");

  let newCaptureId: string | null = null;
  if (body.status === "completed" && body.capture) {
    const c = body.capture;
    const { error: insertError } = await admin.from("thermal_captures").insert({
      id: c.id,
      session_id: body.sessionId,
      org_id: session.org_id,
      filename: c.filename,
      storage_path: c.storagePath,
      npz_data_path: c.npzDataPath,
      preview_path: c.previewPath,
      file_size_bytes: 0,
      content_type: "image/jpeg",
      quality_metrics: { is_radiometric: true, min_temp_c: c.minC, max_temp_c: c.maxC },
      metadata: {
        panorama: true,
        source_capture_ids: c.sourceCaptureIds,
        source_filenames: c.sourceFilenames,
      },
    });
    if (insertError) return serverError(insertError.message);
    newCaptureId = c.id;
  }

  const metadata = (session.metadata as Record<string, unknown>) ?? {};
  const requests = Array.isArray(metadata.panorama_requests) ? [...(metadata.panorama_requests as Record<string, unknown>[])] : [];
  const idx = typeof body.requestIndex === "number" ? body.requestIndex : requests.length - 1;
  if (idx >= 0 && idx < requests.length) {
    requests[idx] = {
      ...requests[idx],
      status: body.status,
      result_capture_id: newCaptureId,
      error_log: body.errorLog ?? null,
      completed_at: new Date().toISOString(),
    };
    const { error: updErr } = await admin
      .from("thermal_analysis_sessions")
      .update({ metadata: { ...metadata, panorama_requests: requests } })
      .eq("id", body.sessionId);
    if (updErr) return serverError(updErr.message);
  }

  return ok({ received: true, captureId: newCaptureId });
}
