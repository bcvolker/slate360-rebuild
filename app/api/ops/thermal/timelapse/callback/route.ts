import { NextRequest } from "next/server";
import { unauthorized, badRequest, serverError, ok } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";

export const runtime = "nodejs";

type Body = {
  sessionId: string;
  requestIndex?: number;
  status: "completed" | "failed";
  mp4Key?: string;
  frames?: number;
  errorLog?: string;
};

/** Modal motion-render callback — marks the session's motion request done + stores the MP4 key. */
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
    .select("id, metadata")
    .eq("id", body.sessionId)
    .maybeSingle();
  if (error) return serverError(error.message);
  if (!session) return badRequest("Session not found");

  const metadata = (session.metadata as Record<string, unknown>) ?? {};
  const requests = Array.isArray(metadata.motion_requests) ? [...(metadata.motion_requests as Record<string, unknown>[])] : [];
  const idx = typeof body.requestIndex === "number" ? body.requestIndex : requests.length - 1;
  if (idx >= 0 && idx < requests.length) {
    requests[idx] = {
      ...requests[idx],
      status: body.status,
      mp4_key: body.mp4Key ?? null,
      frames: body.frames ?? null,
      error_log: body.errorLog ?? null,
      completed_at: new Date().toISOString(),
    };
    const { error: updErr } = await admin
      .from("thermal_analysis_sessions")
      .update({ metadata: { ...metadata, motion_requests: requests } })
      .eq("id", body.sessionId);
    if (updErr) return serverError(updErr.message);
  }
  return ok({ received: true });
}
