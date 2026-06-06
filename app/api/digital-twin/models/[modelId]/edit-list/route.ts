import type { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { getScopedTwinModel } from "@/lib/digital-twin/assert-model-access";
import { parseEditList } from "@/lib/digital-twin/edit-list-types";

type RouteCtx = { params: Promise<{ modelId: string }> };

export const GET = (req: NextRequest, ctx: RouteCtx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    const { modelId } = await ctx.params;
    const model = await getScopedTwinModel(admin, modelId, orgId, "id, edit_list");
    if (!model) return notFound("Model not found");
    return ok({ edit_list: parseEditList(model.edit_list) });
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

    if (
      typeof body !== "object" ||
      body === null ||
      !("edit_list" in body) ||
      !Array.isArray((body as { edit_list: unknown }).edit_list)
    ) {
      return badRequest("edit_list array is required");
    }

    const editList = parseEditList((body as { edit_list: unknown }).edit_list);
    const { error } = await admin
      .from("digital_twin_models")
      .update({ edit_list: editList })
      .eq("id", modelId)
      .eq("org_id", orgId!);

    if (error) return serverError(error.message);
    return ok({ edit_list: editList });
  });
