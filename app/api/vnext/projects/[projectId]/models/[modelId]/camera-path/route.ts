import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { readProjectCameraPath, writeProjectCameraPath } from "@/lib/vnext/views/camera-path-access";
import { playbackModelMatches } from "@/lib/vnext/views/playback-state";

type Params = { params: Promise<{ projectId: string; modelId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { modelId } = await ctx.params;
    const result = await readProjectCameraPath(admin, projectId, modelId);
    if (result === "hidden" || result === "missing") return notFound("Not found");
    return ok({ modelId, cameraPath: result.path });
  });
}

export function PATCH(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, user, projectId, orgId }) => {
    const { modelId } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { modelId?: string; cameraPath?: unknown } | null;
    if (!body || typeof body !== "object" || !("cameraPath" in body)) return badRequest("cameraPath is required.");
    if (body.modelId && !playbackModelMatches(modelId, body.modelId)) return notFound("Not found");
    const result = await writeProjectCameraPath(admin, user.id, projectId, orgId, modelId, body.cameraPath);
    if (result === "ok") return ok({ ok: true });
    if (result === "denied") return forbidden("You do not have permission to save this path.");
    if (result === "hidden" || result === "missing") return notFound("Not found");
    return serverError("The camera path could not be saved.");
  });
}
