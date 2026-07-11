import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { THERMAL_AI_CREDITS_PER_IMAGE, THERMAL_AI_METERING_ENABLED } from "@/lib/thermal/ai-credits";

export const runtime = "nodejs";

const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

type RouteContext = { params: Promise<{ sessionId: string }> };

type Body = {
  /** Limit to specific captures; omit to interpret every flagged capture in the session. */
  capture_ids?: string[];
  /** Inspection discipline that scopes allowed causes. */
  profile?: string;
};

/**
 * Opt-in scene-aware AI interpretation. Nothing here costs money until the user
 * presses the "AI scene check" button that calls this route. R1 (Addendum H2):
 * this now creates a thermal_processing_jobs row (job_type "interpret") so it
 * gets dedupe + Realtime progress + reconciler coverage like every other job
 * type — previously fire-and-forget with a sleep-then-refresh hack on the client.
 */
export const POST = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async ({ user, admin, orgId, req: request }) => {
    if (!orgId) return badRequest("Organization context required");
    const { sessionId } = await ctx.params;

    const body = (await request.json().catch(() => ({}))) as Body;
    const profile = typeof body.profile === "string" ? body.profile : "general";

    const { data: session, error: sessionError } = await admin
      .from("thermal_analysis_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (sessionError) return serverError(sessionError.message);
    if (!session) return notFound("Session not found");

    // Resolve the eligible capture set up front (same filter the trigger task
    // applies) so the job row's input_capture_ids is concrete for partial-failure
    // tracking and the Retry-failed path, instead of an open-ended "whole session".
    let eligibleQuery = admin
      .from("thermal_captures")
      .select("id, anomalies, preview_path")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (body.capture_ids?.length) eligibleQuery = eligibleQuery.in("id", body.capture_ids);
    const { data: candidates, error: candidatesError } = await eligibleQuery;
    if (candidatesError) return serverError(candidatesError.message);

    const captureIds = (candidates ?? [])
      .filter((r) => Array.isArray(r.anomalies) && r.anomalies.length > 0 && r.preview_path)
      .map((r) => r.id);
    if (!captureIds.length) {
      return badRequest("No captures with detected anomalies + a decoded preview to interpret");
    }

    // S6-CR credit metering (Addendum H3): code ships wired but OFF by default
    // (CEO-only, unmetered by design — B4). When flipped on for non-CEO
    // exposure, a session without enough credits gets a 402-shaped response
    // the UI can turn into a "Buy credits" prompt instead of silently running.
    if (THERMAL_AI_METERING_ENABLED) {
      const required = captureIds.length * THERMAL_AI_CREDITS_PER_IMAGE;
      const { data: org } = await admin.from("organizations").select("credits_balance").eq("id", orgId).maybeSingle();
      const balance = Number(org?.credits_balance ?? 0);
      if (balance < required) {
        return ok({ error: "insufficient_credits", required, balance }, 402);
      }
    }

    const dedupeKey = createHash("sha256")
      .update(`${orgId}:${sessionId}:interpret:${[...captureIds].sort().join(",")}:${profile}`)
      .digest("hex");

    const { data: activeJob } = await admin
      .from("thermal_processing_jobs")
      .select("id, status, progress_pct, job_type")
      .eq("dedupe_key", dedupeKey)
      .in("status", ["queued", "processing"])
      .maybeSingle();
    if (activeJob) return ok({ dispatched: true, deduped: true, job: activeJob });

    const { data: job, error: jobError } = await admin
      .from("thermal_processing_jobs")
      .insert({
        session_id: sessionId,
        org_id: orgId,
        created_by: user.id,
        job_type: "interpret",
        status: "queued",
        input_capture_ids: captureIds,
        dedupe_key: dedupeKey,
      })
      .select("id, status, progress_pct, job_type")
      .single();
    if (jobError || !job) return serverError(jobError?.message ?? "Failed to create interpret job");

    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      const handle = await tasks.trigger(
        "thermal.interpret",
        { sessionId, orgId, captureIds, profile },
        undefined,
        triggerRequestOptions,
      );
      await admin.from("thermal_processing_jobs").update({ status: "processing" }).eq("id", job.id);
      return ok({ dispatched: true, runId: handle.id, job: { ...job, status: "processing" } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await admin
        .from("thermal_processing_jobs")
        .update({
          status: "failed",
          error_log: `Dispatch error: ${msg}`,
          failure_reason: "dispatch_failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return serverError(`Failed to start AI scene check: ${msg}`);
    }
  });
