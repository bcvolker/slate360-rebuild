import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import {
  ok,
  badRequest,
  serverError,
  unauthorized,
  notFound,
} from "@/lib/server/api-response";
import { getAssetById, updateAsset, deleteAsset } from "@/lib/content-studio/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

/** GET /api/content-studio/assets/[assetId] */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) => {
  const { assetId } = await params;
  return withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const asset = await getAssetById(admin, assetId, { orgId });
      if (!asset) return notFound("Asset not found");
      return ok(asset);
    } catch (err: unknown) {
      console.error("[GET /api/content-studio/assets/:id]", err);
      return serverError("Failed to fetch asset");
    }
  });
};

/** PATCH /api/content-studio/assets/[assetId] */
export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) => {
  const { assetId } = await params;
  return withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const body = await req.json();
      if (!body || Object.keys(body).length === 0) return badRequest("Empty update body");
      const updated = await updateAsset(admin, assetId, body, { orgId });
      return ok(updated);
    } catch (err: unknown) {
      console.error("[PATCH /api/content-studio/assets/:id]", err);
      return serverError("Failed to update asset");
    }
  });
};

/** DELETE /api/content-studio/assets/[assetId] */
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) => {
  const { assetId } = await params;
  return withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const asset = await deleteAsset(admin, assetId, { orgId });

      const s3Keys: string[] = [asset.s3_key];
      if (s3Keys.length > 0) await deleteS3Objects(s3Keys);

      const recovered = Number(asset.file_size_bytes) || 0;
      if (recovered > 0) await recoverOrgStorage(orgId, recovered);

      return ok({ success: true, assetId: asset.id });
    } catch (err: unknown) {
      console.error("[DELETE /api/content-studio/assets/:id]", err);
      return serverError("Failed to delete asset");
    }
  });
};
