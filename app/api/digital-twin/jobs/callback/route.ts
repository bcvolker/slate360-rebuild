import { NextRequest } from "next/server";
import { unauthorized, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleTwinJobCallback, type TwinWorkerCallbackPayload } from "@/lib/twin/job-callback";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[POST /api/digital-twin/jobs/callback] GPU_WORKER_SECRET_KEY not configured");
    return serverError("Worker callback not configured");
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-worker-signature");

  if (!verifyWorkerSignature(rawBody, signature, secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: TwinWorkerCallbackPayload;
  try {
    body = JSON.parse(rawBody) as TwinWorkerCallbackPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.jobId) return badRequest("jobId is required");
  if (body.status !== "completed" && body.status !== "failed") {
    return badRequest("status must be completed or failed");
  }

  try {
    const admin = createAdminClient();
    const result = await handleTwinJobCallback(admin, body);

    if (!result.ok) {
      if (result.status === 400) return badRequest(result.error ?? "Bad request");
      if (result.status === 404) {
        return new Response(JSON.stringify({ error: result.error ?? "Not found" }), { status: 404 });
      }
      if (result.status === 409) {
        return new Response(JSON.stringify({ error: result.error ?? "Conflict" }), { status: 409 });
      }
      return serverError(result.error ?? "Callback failed");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        jobId: body.jobId,
        modelId: result.modelId,
        creditsCharged: result.creditsCharged ?? 0,
        idempotent: result.idempotent ?? false,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[POST /api/digital-twin/jobs/callback]", err);
    return serverError(err instanceof Error ? err.message : "Callback failed");
  }
}
