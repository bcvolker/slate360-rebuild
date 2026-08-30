import { NextRequest } from "next/server";
import { unauthorized, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";
import { handleWalkthroughJobCallback, type WalkthroughCallbackPayload } from "@/lib/spatial-walkthrough/job-callback";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) return serverError("Worker callback not configured");

  const rawBody = await req.text();
  const signature = req.headers.get("x-worker-signature");
  if (!verifyWorkerSignature(rawBody, signature, secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: WalkthroughCallbackPayload;
  try {
    body = JSON.parse(rawBody) as WalkthroughCallbackPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.jobId) return badRequest("jobId is required");
  if (!["completed", "failed", "progress"].includes(body.status)) {
    return badRequest("status must be completed, failed, or progress");
  }

  try {
    const result = await handleWalkthroughJobCallback(createAdminClient(), body);
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), { status: result.status ?? 500 });
    }
    return new Response(JSON.stringify({ ok: true, idempotent: result.idempotent ?? false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Callback failed");
  }
}
