import { NextRequest, NextResponse } from "next/server";
import { claimThermalShareView, resolveThermalShareToken } from "@/lib/thermal/share-token";
import { shareUnlockCookieName, verifyShareUnlockProof } from "@/lib/thermal/share-password";
import { getThermalSharePasswordHash } from "@/lib/thermal/share-token";
import { captureAllowedByLayerConfig } from "@/lib/thermal/layer-config";
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

  // Persist reviewer marks on the capture anomalies jsonb (visible in ops session gallery).
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data: tokenRow } = await supabase
    .from("thermal_analysis_share_tokens")
    .select("session_id, layer_config")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow?.session_id) {
    return NextResponse.json({ error: "Share unavailable" }, { status: 404 });
  }

  const { data: cap } = await supabase
    .from("thermal_captures")
    .select("id, session_id, anomalies")
    .eq("id", body.captureId)
    .eq("session_id", tokenRow.session_id)
    .maybeSingle();

  if (!cap) {
    return NextResponse.json({ error: "Capture not found" }, { status: 404 });
  }

  const layerConfig = (tokenRow.layer_config as Record<string, unknown>) ?? {};
  if (!captureAllowedByLayerConfig(body.captureId, layerConfig)) {
    return NextResponse.json({ error: "Capture not included in this share link" }, { status: 403 });
  }

  const currentAnomalies = (cap?.anomalies as Array<Record<string, unknown>>) || [];
  const updated = currentAnomalies.map((a) =>
    String(a.id ?? "") === body.anomalyId
      ? { ...a, user_mark: body.mark, marked_at: new Date().toISOString() }
      : a,
  );

  await supabase.from("thermal_captures").update({ anomalies: updated }).eq("id", body.captureId);

  return NextResponse.json({ ok: true, message: "Annotation recorded." });
}
