import { NextRequest } from "next/server";
import { unauthorized, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleThermalJobCallback, type ThermalJobCallbackResult } from "@/lib/thermal/job-callback";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";
import type { ThermalWorkerCallbackPayload } from "@/lib/thermal/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[POST /api/ops/thermal/jobs/callback] GPU_WORKER_SECRET_KEY not configured");
    return serverError("Worker callback not configured");
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-worker-signature");

  if (!verifyWorkerSignature(rawBody, signature, secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: ThermalWorkerCallbackPayload;
  try {
    body = JSON.parse(rawBody) as ThermalWorkerCallbackPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.jobId) return badRequest("jobId is required");
  if (!["completed", "failed", "progress"].includes(body.status)) {
    return badRequest("status must be completed, failed, or progress");
  }

  try {
    const admin = createAdminClient();
    const result: ThermalJobCallbackResult = await handleThermalJobCallback(admin, body);

    if (!result.ok) {
      if (result.status === 400) return badRequest(result.error ?? "Bad request");
      if (result.status === 404) {
        return new Response(JSON.stringify({ error: result.error ?? "Not found" }), { status: 404 });
      }
      return serverError(result.error ?? "Callback failed");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        jobId: body.jobId,
        idempotent: result.idempotent ?? false,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[POST /api/ops/thermal/jobs/callback]", err);
    return serverError(err instanceof Error ? err.message : "Callback failed");
  }
}
