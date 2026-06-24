import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

/**
 * Opt-in scene-aware AI interpretation. Deliberately does NOT create a
 * thermal_processing_jobs row (the job_type CHECK constraint has no "interpret"
 * value and DDL is gated) — it loads the captures, dispatches them to the Modal
 * `interpret` endpoint, and the worker writes results back via the signed
 * /api/ops/thermal/interpret/callback route. Cost is capped in the worker.
 */

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase credentials required for thermal.interpret");
  return createClient(url, key);
};

function getInterpretEndpoint(): string {
  return (
    process.env.MODAL_THERMAL_INTERPRET_ENDPOINT?.trim() ||
    "https://bcvolker--interpret.modal.run"
  );
}

type InterpretPayload = {
  sessionId: string;
  orgId: string;
  captureIds?: string[];
  /** Inspection discipline that scopes allowed causes (general/building/electrical/…). */
  profile?: string;
};

export const thermalInterpretTask = task({
  id: "thermal.interpret",
  maxDuration: 600,
  run: async (payload: InterpretPayload) => {
    const supabase = getSupabase();
    const { sessionId, orgId, captureIds, profile } = payload;

    let query = supabase
      .from("thermal_captures")
      .select("id, filename, anomalies, preview_path")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (captureIds?.length) query = query.in("id", captureIds);

    const { data: rows, error } = await query;
    if (error) throw new Error(`Failed to load captures: ${error.message}`);

    // Only captures that have detected anomalies AND a decoded preview are worth
    // interpreting — the model needs the image and there must be findings to ground.
    const captures = (rows ?? [])
      .filter((r) => Array.isArray(r.anomalies) && r.anomalies.length > 0 && r.preview_path)
      .map((r) => ({
        captureId: r.id,
        filename: r.filename,
        previewPath: r.preview_path,
        anomalies: r.anomalies,
      }));

    if (!captures.length) {
      return { dispatched: false, reason: "no captures with anomalies + preview" };
    }

    const response = await fetch(getInterpretEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, orgId, captures, profile: profile || "general" }),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new Error(`Modal interpret dispatch failed (${response.status}): ${detail}`);
    }

    return {
      dispatched: true,
      captureCount: captures.length,
      runId: response.headers.get("x-modal-run-id") ?? undefined,
    };
  },
});
