import { NextRequest } from "next/server";
import { unauthorized, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";
import { handleTourJobCallback, type TourWorkerCallbackPayload } from "@/lib/tours/job-callback";

export const runtime = "nodejs";

// POST /api/tours/jobs/callback — signed webhook from the Modal tour-ingest worker.
export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) return serverError("Worker callback not configured");

  const rawBody = await req.text();
  const signature = req.headers.get("x-worker-signature");
  if (!verifyWorkerSignature(rawBody, signature, secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: TourWorkerCallbackPayload;
  try {
    body = JSON.parse(rawBody) as TourWorkerCallbackPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.jobId) return badRequest("jobId is required");
  if (!["completed", "failed", "progress"].includes(body.status)) {
    return badRequest("status must be completed, failed, or progress");
  }

  try {
    const admin = createAdminClient();
    const result = await handleTourJobCallback(admin, body);
    if (!result.ok) {
      if (result.status === 404) return new Response(JSON.stringify({ error: result.error }), { status: 404 });
      return serverError(result.error ?? "Callback failed");
    }
    return new Response(JSON.stringify({ ok: true, jobId: body.jobId, idempotent: result.idempotent ?? false }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[POST /api/tours/jobs/callback]", err);
    return serverError(err instanceof Error ? err.message : "Callback failed");
  }
}
