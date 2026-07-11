import { NextRequest } from "next/server";
import { unauthorized, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWorkerSignature } from "@/lib/twin/worker-signature";
import { deductCredits } from "@/lib/credits/idempotency";
import { THERMAL_AI_CREDITS_PER_IMAGE, THERMAL_AI_METERING_ENABLED } from "@/lib/thermal/ai-credits";

export const runtime = "nodejs";

type InterpretFinding = {
  anomaly_index?: number;
  observation?: string;
  suggested_causes?: string[];
};
type InterpretResult = {
  captureId?: string;
  scene_class?: string;
  scene_confidence?: number;
  visible_elements?: string[];
  findings?: InterpretFinding[];
};
type InterpretCallbackBody = {
  sessionId?: string;
  status?: "completed" | "capped" | "failed";
  results?: InterpretResult[];
  usage?: Record<string, unknown>;
  errorLog?: string;
};

/**
 * Receives scene-aware interpretation results from the Modal worker and writes
 * them back into existing JSON columns — per-anomaly `observation` +
 * `suggested_causes` inside `anomalies`, and scene context into `quality_metrics`.
 * No schema change required. Status/usage is recorded on session.metadata.ai_interpret
 * so the opt-in UI can poll and react (including the spend-cap "capped" state).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.GPU_WORKER_SECRET_KEY?.trim();
  if (!secret) return serverError("Worker callback not configured");

  const rawBody = await req.text();
  if (!verifyWorkerSignature(rawBody, req.headers.get("x-worker-signature"), secret)) {
    return unauthorized("Invalid worker signature");
  }

  let body: InterpretCallbackBody;
  try {
    body = JSON.parse(rawBody) as InterpretCallbackBody;
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.sessionId) return badRequest("sessionId is required");

  try {
    const admin = createAdminClient();
    let updated = 0;

    if (body.status === "completed" && Array.isArray(body.results)) {
      for (const r of body.results) {
        if (!r.captureId) continue;
        const { data: cap } = await admin
          .from("thermal_captures")
          .select("anomalies, quality_metrics")
          .eq("id", r.captureId)
          .maybeSingle();
        if (!cap) continue;

        const anomalies = Array.isArray(cap.anomalies) ? [...(cap.anomalies as Record<string, unknown>[])] : [];
        for (const f of r.findings ?? []) {
          const idx = f.anomaly_index;
          if (typeof idx === "number" && idx >= 0 && idx < anomalies.length && anomalies[idx]) {
            anomalies[idx] = {
              ...anomalies[idx],
              observation: f.observation ?? null,
              suggested_causes: Array.isArray(f.suggested_causes) ? f.suggested_causes : [],
              ai_interpreted: true,
            };
          }
        }
        const qm = {
          ...((cap.quality_metrics as Record<string, unknown> | null) ?? {}),
          scene: r.scene_class ?? null,
          scene_confidence: r.scene_confidence ?? null,
          ai_visible_elements: r.visible_elements ?? [],
          ai_interpreted: true,
        };
        await admin.from("thermal_captures").update({ anomalies, quality_metrics: qm }).eq("id", r.captureId);
        updated += 1;
      }
    }

    // Record status + usage on the session so the opt-in UI can poll/react.
    const { data: sess } = await admin
      .from("thermal_analysis_sessions")
      .select("metadata")
      .eq("id", body.sessionId)
      .maybeSingle();
    const metadata = {
      ...((sess?.metadata as Record<string, unknown> | null) ?? {}),
      ai_interpret: {
        status: body.status ?? "completed",
        message: body.errorLog ?? null,
        usage: body.usage ?? null,
        captures_updated: updated,
        updated_at: new Date().toISOString(),
      },
    };
    await admin.from("thermal_analysis_sessions").update({ metadata }).eq("id", body.sessionId);

    // R1: close out the job row this run's dispatch created, so the job chip
    // and Realtime subscription reflect completion/failure like every other job.
    const { data: job } = await admin
      .from("thermal_processing_jobs")
      .select("id, org_id, input_capture_ids")
      .eq("session_id", body.sessionId)
      .eq("job_type", "interpret")
      .in("status", ["queued", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (job) {
      const inputIds = (job.input_capture_ids as string[] | null) ?? [];
      const partial = body.status === "capped" && updated < inputIds.length;
      await admin
        .from("thermal_processing_jobs")
        .update({
          status: body.status === "failed" ? "failed" : "completed",
          progress_pct: 100,
          stage: "complete",
          completed_at: new Date().toISOString(),
          partial,
          failure_reason: body.status === "failed" ? "interpret_failed" : partial ? "spend_cap_reached" : null,
          error_log:
            body.status === "failed"
              ? (body.errorLog ?? "Interpret worker reported failure")
              : partial
                ? `${updated}/${inputIds.length} processed — spend cap reached`
                : null,
        })
        .eq("id", job.id);

      // S6-CR debit (flag-gated, see ai-credits.ts): idempotency-keyed on the
      // job id, same shared util as twin's job-callback — safe against retries.
      if (THERMAL_AI_METERING_ENABLED && job.org_id && updated > 0 && body.status !== "failed") {
        await deductCredits(
          admin,
          job.org_id,
          updated * THERMAL_AI_CREDITS_PER_IMAGE,
          `${job.org_id}:thermal-ai:${job.id}`,
          "Thermal AI analysis",
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[POST /api/ops/thermal/interpret/callback]", err);
    return serverError(err instanceof Error ? err.message : "Callback failed");
  }
}
