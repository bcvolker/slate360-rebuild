import { NextRequest, NextResponse } from "next/server";
import { claimThermalShareView, resolveThermalShareToken } from "@/lib/thermal/share-token";
import { shareUnlockCookieName, verifyShareUnlockProof } from "@/lib/thermal/share-password";
import { getThermalSharePasswordHash } from "@/lib/thermal/share-token";
import { cookies } from "next/headers";

type Params = { params: Promise<{ token: string }> };

async function canAnnotate(token: string, requiresPassword: boolean): Promise<boolean> {
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) return false;
  if (gate.role !== "annotate" && gate.role !== "download") return false;
  if (!requiresPassword) return true;
  const storedHash = await getThermalSharePasswordHash(token);
  if (!storedHash) return true;
  const cookieStore = await cookies();
  const proof = cookieStore.get(shareUnlockCookieName(token))?.value;
  return !!proof && verifyShareUnlockProof(token, storedHash, proof);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  if (!(await canAnnotate(token, gate.requiresPassword))) {
    return NextResponse.json({ error: "Annotate not permitted for this link" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    captureId?: string;
    anomalyId?: string;
    mark?: "confirmed" | "false_positive";
  } | null;

  if (!body?.captureId || !body?.anomalyId || !body?.mark) {
    return NextResponse.json({ error: "captureId, anomalyId and mark required" }, { status: 400 });
  }

  // Persist annotation by updating the anomalies jsonb on the capture (simple for ops demo).
  // In production this could go to a separate thermal_analysis_feedback table with moderation.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  // Fetch current anomalies
  const { data: cap } = await supabase
    .from("thermal_captures")
    .select("anomalies")
    .eq("id", body.captureId)
    .single();

  const currentAnomalies = (cap?.anomalies as Array<Record<string, unknown>>) || [];
  const updated = currentAnomalies.map((a) =>
    String(a.id ?? "") === body.anomalyId
      ? { ...a, user_mark: body.mark, marked_at: new Date().toISOString() }
      : a,
  );

  await supabase.from("thermal_captures").update({ anomalies: updated }).eq("id", body.captureId);

  return NextResponse.json({ ok: true, message: "Annotation recorded (ops moderation pending)." });
}
