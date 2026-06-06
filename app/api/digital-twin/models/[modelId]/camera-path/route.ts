import type { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { getScopedTwinModel } from "@/lib/digital-twin/assert-model-access";
import { parseCameraPath } from "@/lib/digital-twin/camera-path-types";

type RouteCtx = { params: Promise<{ modelId: string }> };

export const GET = (req: NextRequest, ctx: RouteCtx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    const { modelId } = await ctx.params;
    const model = await getScopedTwinModel(admin, modelId, orgId, "id, camera_path");
    if (!model) return notFound("Model not found");
    return ok({ camera_path: parseCameraPath(model.camera_path) });
  });

export const PATCH = (req: NextRequest, ctx: RouteCtx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    const { modelId } = await ctx.params;
    const model = await getScopedTwinModel(admin, modelId, orgId, "id");
    if (!model) return notFound("Model not found");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    if (typeof body !== "object" || body === null || !("camera_path" in body)) {
      return badRequest("camera_path object is required");
    }

    const cameraPath = parseCameraPath((body as { camera_path: unknown }).camera_path);
    const { error } = await admin
      .from("digital_twin_models")
      .update({ camera_path: cameraPath })
      .eq("id", modelId)
      .eq("org_id", orgId!);

    if (error) return serverError(error.message);
    return ok({ camera_path: cameraPath });
  });
