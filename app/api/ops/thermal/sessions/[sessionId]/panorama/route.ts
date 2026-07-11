import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };
type Body = { captureIds?: string[] };

function getPanoramaEndpoint(): string | null {
  const base = process.env.MODAL_THERMAL_ENDPOINT?.trim();
  return base ? base.replace("-process.modal.run", "-panorama.modal.run") : null;
}

/**
 * PAN: dispatches a stitch request (doc D2/B2's headline contract). Follows
 * the SAME lightweight pattern as /api/ops/thermal/timelapse/route.ts — a
 * session.metadata-tracked request, no thermal_processing_jobs row (that
 * table's job_type is DDL-gated, per the R1 doc note) — dispatched straight
 * to the Modal `panorama` endpoint (derived from MODAL_THERMAL_ENDPOINT,
 * same app, different label — no new env var).
 */
export const POST = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async ({ admin, orgId, req: request }) => {
    if (!orgId) return badRequest("Organization context required");
    const { sessionId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as Body | null;
    const captureIds = Array.isArray(body?.captureIds) ? body.captureIds : [];
    if (captureIds.length < 2) return badRequest("Select at least 2 images to stitch a panorama");

    const { data: session, error: sessionError } = await admin
      .from("thermal_analysis_sessions")
      .select("id, metadata")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (sessionError) return serverError(sessionError.message);
    if (!session) return notFound("Session not found");

    const { data: caps, error: capsError } = await admin
      .from("thermal_captures")
      .select("id, filename, npz_data_path")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .in("id", captureIds);
    if (capsError) return serverError(capsError.message);

    const sources = (caps ?? [])
      .filter((c) => c.npz_data_path)
      .map((c) => ({ captureId: c.id, filename: c.filename, npzDataPath: c.npz_data_path }));
    if (sources.length < 2) {
      return badRequest("At least 2 selected images need decoded temperature data (run Decode temperatures first)");
    }

    const metadata = { ...((session.metadata ?? {}) as Record<string, unknown>) };
    const requests = Array.isArray(metadata.panorama_requests) ? (metadata.panorama_requests as Record<string, unknown>[]) : [];
    const requestIndex = requests.length;
    const entry = {
      source_capture_ids: sources.map((s) => s.captureId),
      status: "queued",
      created_at: new Date().toISOString(),
    };
    const { error: updErr } = await admin
      .from("thermal_analysis_sessions")
      .update({ metadata: { ...metadata, panorama_requests: [...requests, entry] } })
      .eq("id", sessionId);
    if (updErr) return serverError(updErr.message);

    const endpoint = getPanoramaEndpoint();
    let dispatched = false;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, orgId, requestIndex, captures: sources }),
        });
        dispatched = res.ok;
      } catch {
        dispatched = false;
      }
    }

    return ok({ queued: true, dispatched, sources: sources.length, requestIndex });
  });
