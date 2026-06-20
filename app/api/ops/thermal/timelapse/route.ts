import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type Body = {
  sessionId: string;
  mode: "timelapse" | "video";
  frameIds: string[];
  settings: {
    aspect: string;
    fps: number;
    smoothing: string;
    deflicker: boolean;
    overlay: string;
    retainRadiometric: boolean;
  };
};

/**
 * Records a time-lapse / video render request (frame order + export settings) on the
 * session. The cloud render worker (Modal + ffmpeg: aspect-ratio, deflicker, motion
 * interpolation / RIFE, optional measurement overlays) consumes this spec. Kept as a
 * stored spec rather than a dispatched job until the worker is deployed, so the button
 * never silently hangs on a queue nothing is processing.
 */
export const POST = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, orgId, req: request }) => {
    if (!orgId) return badRequest("Organization context required");
    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.sessionId) return badRequest("sessionId is required");
    if (!Array.isArray(body.frameIds) || body.frameIds.length === 0) {
      return badRequest("Select at least one frame for the timeline");
    }

    const { data: session, error } = await admin
      .from("thermal_analysis_sessions")
      .select("id, metadata")
      .eq("id", body.sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!session) return notFound("Session not found");

    const metadata = (session.metadata as Record<string, unknown>) ?? {};
    const requests = Array.isArray(metadata.motion_requests) ? metadata.motion_requests : [];
    const entry = {
      mode: body.mode,
      frame_ids: body.frameIds,
      settings: body.settings,
      status: "queued",
    };

    const { error: updErr } = await admin
      .from("thermal_analysis_sessions")
      .update({ metadata: { ...metadata, motion_requests: [...requests, entry] } })
      .eq("id", body.sessionId);
    if (updErr) return serverError(updErr.message);

    return ok({ queued: true, frames: body.frameIds.length });
  });
