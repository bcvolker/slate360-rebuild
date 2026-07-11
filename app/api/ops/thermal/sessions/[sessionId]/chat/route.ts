import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { THERMAL_AI_METERING_ENABLED } from "@/lib/thermal/ai-credits";
import type { ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

type ChatBody = { capture_id?: string; message?: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  capture_id: string | null;
  at: string;
  /** Parsed ```revision-proposal block, when the assistant proposed a finding correction. */
  proposal?: { anomaly_index: number; note: string } | null;
};

function getChatEndpoint(): string {
  return process.env.MODAL_THERMAL_CHAT_ENDPOINT?.trim() || "https://bcvolker--thermal-chat.modal.run";
}

/** Extracts the assistant's ```revision-proposal fenced JSON block, if present, from its reply text. */
function extractProposal(reply: string): { text: string; proposal: { anomaly_index: number; note: string } | null } {
  const match = reply.match(/```revision-proposal\s*([\s\S]*?)```/);
  if (!match) return { text: reply.trim(), proposal: null };
  const text = (reply.slice(0, match.index) + reply.slice(match.index! + match[0].length)).trim();
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Number.isFinite(parsed.anomaly_index) && typeof parsed.note === "string") {
      return { text, proposal: { anomaly_index: Number(parsed.anomaly_index), note: parsed.note.slice(0, 600) } };
    }
  } catch {
    // malformed block from the model — fall through, show the text without a proposal card
  }
  return { text, proposal: null };
}

/** Builds the grounding-context text the model sees: authoritative facts only, never the raw grid (token discipline). */
function buildGroundingContext(capture: {
  filename: string;
  anomalies: ThermalAnomaly[] | null;
  metadata: Record<string, unknown> | null;
  qualityMetrics: Record<string, unknown> | null;
}): string {
  const meta = capture.metadata ?? {};
  const review = (meta.findings_review ?? null) as { accepted?: string[]; dismissed?: string[]; edits?: Record<string, string> } | null;
  const anomalies = capture.anomalies ?? [];
  const lines = [
    `IMAGE: ${capture.filename}`,
    capture.qualityMetrics?.sensor_model ? `Camera: ${capture.qualityMetrics.sensor_model}` : null,
    meta.ambient_temp_c != null ? `Ambient temp: ${meta.ambient_temp_c}°C` : null,
    meta.humidity_pct != null ? `Humidity: ${meta.humidity_pct}%` : null,
    meta.captured_at ? `Captured: ${meta.captured_at}` : null,
    "",
    "FINDINGS:",
    ...anomalies.map((a, i) => {
      const status = review?.dismissed?.includes(String(i)) ? "dismissed" : review?.accepted?.includes(String(i)) ? "accepted" : "pending";
      const edit = review?.edits?.[String(i)];
      return `  [${i}] type=${a.type} severity=${a.severity} peak_C=${a.temp_c} deltaT_C=${a.delta_c} status=${status}${edit ? ` operator_note="${edit}"` : ""}`;
    }),
  ].filter((l): l is string => l != null);
  return lines.join("\n");
}

/** Loads the persisted thread for one capture — used to hydrate the drawer on open/reload. */
export const GET = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { sessionId } = await ctx.params;
    const captureId = req.nextUrl.searchParams.get("capture_id");
    if (!captureId) return badRequest("capture_id is required");

    const { data: session, error } = await admin
      .from("thermal_analysis_sessions")
      .select("id, org_id, metadata")
      .eq("id", sessionId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!session || (orgId && session.org_id && session.org_id !== orgId)) return notFound("Session not found");

    const thread = Array.isArray((session.metadata as Record<string, unknown> | null)?.analyst_chat)
      ? ((session.metadata as Record<string, unknown>).analyst_chat as ChatMessage[])
      : [];
    return ok({ thread: thread.filter((m) => m.capture_id === captureId) });
  });

/**
 * S6.6 Analyst chat: a grounded Q&A turn over one image's findings, synchronous
 * (the worker's `chat` endpoint calls Anthropic directly and returns — no job
 * row, unlike interpret). Thread persists in the session's existing generic
 * `metadata` field (additive; no new column) as `metadata.analyst_chat`.
 */
export const POST = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async ({ admin, orgId, req: request }) => {
    const { sessionId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as ChatBody | null;
    if (!body?.capture_id || !body?.message?.trim()) return badRequest("capture_id and message are required");

    const { data: session, error: sessionError } = await admin
      .from("thermal_analysis_sessions")
      .select("id, org_id, metadata")
      .eq("id", sessionId)
      .is("deleted_at", null)
      .maybeSingle();
    if (sessionError) return serverError(sessionError.message);
    if (!session || (orgId && session.org_id && session.org_id !== orgId)) return notFound("Session not found");

    const { data: capture, error: captureError } = await admin
      .from("thermal_captures")
      .select("id, filename, anomalies, metadata, quality_metrics")
      .eq("id", body.capture_id)
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .maybeSingle();
    if (captureError) return serverError(captureError.message);
    if (!capture) return notFound("Capture not found");

    if (THERMAL_AI_METERING_ENABLED) {
      const { data: org } = await admin.from("organizations").select("credits_balance").eq("id", orgId).maybeSingle();
      if (Number(org?.credits_balance ?? 0) < 1) {
        return ok({ error: "insufficient_credits" }, 402);
      }
    }

    const metadata = { ...((session.metadata ?? {}) as Record<string, unknown>) };
    const thread = Array.isArray(metadata.analyst_chat) ? (metadata.analyst_chat as ChatMessage[]) : [];
    const history = thread
      .filter((m) => m.capture_id === body.capture_id)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const grounding = buildGroundingContext({
      filename: capture.filename,
      anomalies: (capture.anomalies ?? null) as ThermalAnomaly[] | null,
      metadata: (capture.metadata ?? null) as Record<string, unknown> | null,
      qualityMetrics: (capture.quality_metrics ?? null) as Record<string, unknown> | null,
    });

    let modalResult: { reply?: string; error?: string };
    try {
      const res = await fetch(getChatEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, groundingContext: grounding, history, message: body.message.trim() }),
      });
      modalResult = await res.json();
      if (!res.ok) return serverError(modalResult.error ?? `Analyst chat failed (${res.status})`);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Analyst chat request failed");
    }
    if (!modalResult.reply) return serverError("Analyst chat returned no reply");

    const { text, proposal } = extractProposal(modalResult.reply);
    const now = new Date().toISOString();
    const nextThread: ChatMessage[] = [
      ...thread,
      { role: "user", content: body.message.trim(), capture_id: body.capture_id, at: now },
      { role: "assistant", content: text, capture_id: body.capture_id, at: now, proposal },
    ];
    metadata.analyst_chat = nextThread.slice(-200);

    const { error: updateError } = await admin.from("thermal_analysis_sessions").update({ metadata }).eq("id", sessionId);
    if (updateError) return serverError(updateError.message);

    return ok({ reply: text, proposal });
  });
