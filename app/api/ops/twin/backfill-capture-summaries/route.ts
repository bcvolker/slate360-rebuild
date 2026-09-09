/**
 * POST /api/ops/twin/backfill-capture-summaries   (Bearer CRON_SECRET)
 *
 * One-off / repeatable: write the capture receipt (capture_metadata.summary) and
 * the twin poster for every uploaded capture that has none. New uploads get
 * theirs at upload-complete; this covers captures from before that existed.
 *
 * Body (optional): { limit?: number, orgId?: string, force?: boolean }
 */
import { NextRequest } from "next/server";

import { ok, unauthorized, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordCaptureSummary } from "@/lib/twin/capture-summary";

export const runtime = "nodejs";
export const maxDuration = 300;

function hasValidSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return bearer === secret;
}

export async function POST(req: NextRequest) {
  if (!hasValidSecret(req)) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { limit?: number; orgId?: string; force?: boolean };
  const limit = Math.min(500, Math.max(1, Number(body.limit) || 100));

  try {
    const admin = createAdminClient();
    let query = admin
      .from("digital_twin_captures")
      .select("id, org_id, capture_metadata")
      .eq("capture_status", "uploaded")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (body.orgId) query = query.eq("org_id", body.orgId);
    const { data: captures, error } = await query;
    if (error) return serverError(error.message);

    const done: string[] = [];
    const skipped: string[] = [];
    for (const capture of captures ?? []) {
      const meta = capture.capture_metadata as { summary?: unknown } | null;
      if (meta?.summary && !body.force) {
        skipped.push(capture.id);
        continue;
      }
      const summary = await recordCaptureSummary(admin, capture.id, capture.org_id);
      (summary ? done : skipped).push(capture.id);
    }
    return ok({ scanned: captures?.length ?? 0, written: done.length, skipped: skipped.length, ids: done });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : String(err));
  }
}
