import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { getModels, createModel } from "@/lib/design-studio/queries";

export const runtime = "nodejs";

/** GET /api/design-studio/models?projectId=xxx */
export const GET = async (req: NextRequest) =>
  withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId is required");

    try {
      const models = await getModels(admin, projectId, { orgId });
      return ok(models);
    } catch (err: unknown) {
      console.error("[GET /api/design-studio/models]", err);
      return serverError("Failed to fetch models");
    }
  });

/** POST /api/design-studio/models */
export const POST = async (req: NextRequest) =>
  withAppAuth("design_studio", req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { projectId, title, description, modelType } = body as {
        projectId: string;
        title: string;
        description?: string;
        modelType?: string;
      };
      if (!projectId || !title) return badRequest("projectId and title are required");

      const model = await createModel(admin, {
        orgId,
        projectId,
        createdBy: user.id,
        title,
        description,
        modelType,
      });
      return ok(model);
    } catch (err: unknown) {
      console.error("[POST /api/design-studio/models]", err);
      return serverError("Failed to create model");
    }
  });
