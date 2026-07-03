import { NextRequest } from "next/server";
import { ok, unauthorized, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { recoverStaleDigitalTwinJobs } from "@/lib/twin/recover-stale-jobs";

export const runtime = "nodejs";

function hasValidSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  return bearer === secret;
}

export async function GET(req: NextRequest) {
  if (!hasValidSecret(req)) {
    return unauthorized();
  }

  try {
    const admin = createAdminClient();
    const processed = await recoverStaleDigitalTwinJobs(admin);

    return ok({ ok: true, processed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/ops/cron/recover-stale-twin-jobs]", { error: message });
    return serverError(message);
  }
}
