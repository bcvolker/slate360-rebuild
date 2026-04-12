import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized, notFound } from "@/lib/server/api-response";
import { getModelById, updateModel, deleteModel, collectModelAssets } from "@/lib/design-studio/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

/** GET /api/design-studio/models/[modelId] */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> },
) => {
  const { modelId } = await params;
  return withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const model = await getModelById(admin, modelId, { orgId });
      if (!model) return notFound("Model not found");
      return ok(model);
    } catch (err: unknown) {
      console.error("[GET /api/design-studio/models/:id]", err);
      return serverError("Failed to fetch model");
    }
  });
};

/** PATCH /api/design-studio/models/[modelId] */
export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> },
) => {
  const { modelId } = await params;
  return withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const body = await req.json();
      if (!body || Object.keys(body).length === 0) return badRequest("Empty update body");
      const updated = await updateModel(admin, modelId, body, { orgId });
      return ok(updated);
    } catch (err: unknown) {
      console.error("[PATCH /api/design-studio/models/:id]", err);
      return serverError("Failed to update model");
    }
  });
};

/** DELETE /api/design-studio/models/[modelId] */
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> },
) => {
  const { modelId } = await params;
  return withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const { model, files } = await collectModelAssets(admin, modelId, { orgId });

      const s3Keys: string[] = [];
      let bytesRecovered = 0;
      if (model?.thumbnail_path) s3Keys.push(model.thumbnail_path);
      for (const f of files) {
        if (f.s3_key) s3Keys.push(f.s3_key);
        bytesRecovered += Number(f.file_size_bytes) || 0;
      }

      if (s3Keys.length > 0) await deleteS3Objects(s3Keys);
      await deleteModel(admin, modelId, { orgId });
      if (bytesRecovered > 0) await recoverOrgStorage(orgId, bytesRecovered);

      return ok({ success: true, deletedFiles: files.length });
    } catch (err: unknown) {
      console.error("[DELETE /api/design-studio/models/:id]", err);
      return serverError("Failed to delete model");
    }
  });
};
