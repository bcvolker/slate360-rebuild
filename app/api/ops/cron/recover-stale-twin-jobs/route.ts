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

    // P0a — sweep assets abandoned mid-upload (status 'uploading' with no storage_key).
    // These used to accumulate forever and were the debris left behind by the duplicate
    // registration bug. Non-fatal: a missing RPC (migration not yet applied) must not break
    // stale-job recovery, which is the cron's primary duty.
    let staleAssetsSwept: number | null = null;
    // 720 min matches the multipart-aware GC hardening (20260727120000): three
    // hours is inside the plausible window for a large file on site LTE, so the
    // earlier 180-min override here could sweep a live upload mid-transfer.
    const { data: swept, error: gcError } = await admin.rpc(
      "gc_stale_digital_twin_upload_assets",
      { p_stale_minutes: 720 },
    );
    if (gcError) {
      console.warn(
        "[cron/recover-stale-twin-jobs] asset GC skipped:",
        gcError.message,
      );
    } else {
      staleAssetsSwept = typeof swept === "number" ? swept : 0;
    }

    return ok({ ok: true, processed, staleAssetsSwept });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/ops/cron/recover-stale-twin-jobs]", { error: message });
    return serverError(message);
  }
}
