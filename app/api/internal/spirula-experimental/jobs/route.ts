import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueSpirulaExperiment } from "@/lib/spirula-experimental/enqueue";

export const runtime = "nodejs";

function tokenOk(header: string | null): boolean {
  const expected = process.env.GPU_WORKER_SECRET_KEY?.trim() ?? "";
  const supplied = header?.trim() ?? "";
  if (!expected || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req.headers.get("x-dispatch-token"))) {
    return unauthorized("dispatch token required");
  }
  let body: { experimentId?: string; captureId?: string; projectId?: string; profile?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (body.profile !== "smoke") return forbidden("only the smoke profile can launch");
  if (!body.experimentId || !body.captureId) return badRequest("experimentId and captureId are required");

  try {
    const result = await enqueueSpirulaExperiment(createAdminClient(), {
      experimentId: body.experimentId,
      captureId: body.captureId,
      projectId: body.projectId,
      profile: "smoke",
    });
    if (!result.ok) {
      if (result.status === 403) return forbidden(result.error);
      if (result.status === 400) return badRequest(result.error);
      return serverError(result.error);
    }
    return ok(result, 202);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "enqueue failed");
  }
}
