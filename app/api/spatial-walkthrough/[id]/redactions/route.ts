import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { isValidRedaction, AUTHORING_MODES, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { RedactionMode, SharePolicy } from "@/lib/spatial-walkthrough/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

function parseRule(body: Record<string, unknown> | null): RedactionRule {
  const mode = (body?.mode as RedactionMode) ?? "skip";
  return {
    clipId: String(body?.clipId ?? ""),
    tStart: Number(body?.tStart),
    tEnd: Number(body?.tEnd),
    yawMin: typeof body?.yawMin === "number" ? body.yawMin : null,
    yawMax: typeof body?.yawMax === "number" ? body.yawMax : null,
    pitchMin: typeof body?.pitchMin === "number" ? body.pitchMin : null,
    pitchMax: typeof body?.pitchMax === "number" ? body.pitchMax : null,
    mode: AUTHORING_MODES.includes(mode) || mode === "solid" || mode === "blur" || mode === "operator-patch" ? mode : "skip",
    policy: (body?.policy as SharePolicy) === "client" ? "client" : "public",
    reason: typeof body?.reason === "string" ? body.reason : null,
    waypointId: typeof body?.waypointId === "string" ? body.waypointId : null,
  };
}

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const rule = parseRule(body);
    if (!isValidRedaction(rule) || !rule.clipId) return badRequest("Invalid redaction interval");
    const { data: clip } = await admin.from("spatial_clips").select("id").eq("id", rule.clipId).eq("walkthrough_id", id).maybeSingle();
    if (!clip) return notFound("Clip not found");
    const { data, error } = await admin.from("spatial_redactions").insert({
      org_id: orgId,
      walkthrough_id: id,
      clip_id: rule.clipId,
      t_start: rule.tStart,
      t_end: rule.tEnd,
      yaw_min: rule.yawMin,
      yaw_max: rule.yawMax,
      pitch_min: rule.pitchMin,
      pitch_max: rule.pitchMax,
      mode: rule.mode,
      policy: rule.policy,
      reason: rule.reason,
      waypoint_id: rule.waypointId,
    }).select("*").single();
    if (error) return serverError(error.message);
    return ok({ redaction: data }, 201);
  }, "author");

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const ruleId = req.nextUrl.searchParams.get("id");
    if (!ruleId) return badRequest("id required");
    const { error } = await admin.from("spatial_redactions").delete().eq("id", ruleId).eq("walkthrough_id", id).eq("org_id", orgId);
    if (error) return serverError(error.message);
    return ok({ deleted: ruleId });
  }, "author");
