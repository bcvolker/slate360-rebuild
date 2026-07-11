import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveThermalShareToken } from "@/lib/thermal/share-token";
import { isThermalShareUnlocked } from "@/lib/thermal/share-access";
import { readCaptureGrid } from "@/lib/thermal/read-capture-grid";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string; captureId: string }> };

/**
 * Radiometric Live Link (S7.5/Addendum A4) — the flagship deliverable: lazy
 * per-image grid fetch so a CLIENT with no login can hover anywhere on a
 * shared thermal image and read a real temperature, not just a colorized
 * picture. Token-gated (same validity/password rules as the page itself),
 * scoped to captures that actually belong to the token's session so one
 * link can never read another session's data.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { token, captureId } = await params;

  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  if (!(await isThermalShareUnlocked(token))) {
    return NextResponse.json({ error: "locked" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("thermal_analysis_share_tokens")
    .select("session_id, org_id")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow) return NextResponse.json({ error: "invalid" }, { status: 403 });

  const { data: capture } = await admin
    .from("thermal_captures")
    .select("id")
    .eq("id", captureId)
    .eq("session_id", tokenRow.session_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!capture) return NextResponse.json({ error: "Capture not part of this share link" }, { status: 404 });

  const result = await readCaptureGrid(admin, captureId, tokenRow.org_id as string | null);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.grid);
}
