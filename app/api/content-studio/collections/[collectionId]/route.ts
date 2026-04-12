import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import {
  ok,
  badRequest,
  serverError,
  unauthorized,
  notFound,
} from "@/lib/server/api-response";
import {
  getCollectionById,
  updateCollection,
  deleteCollection,
  collectCollectionAssets,
} from "@/lib/content-studio/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

/** GET /api/content-studio/collections/[collectionId] */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) => {
  const { collectionId } = await params;
  return withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const collection = await getCollectionById(admin, collectionId, { orgId });
      if (!collection) return notFound("Collection not found");
      return ok(collection);
    } catch (err: unknown) {
      console.error("[GET /api/content-studio/collections/:id]", err);
      return serverError("Failed to fetch collection");
    }
  });
};

/** PATCH /api/content-studio/collections/[collectionId] */
export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) => {
  const { collectionId } = await params;
  return withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const body = await req.json();
      if (!body || Object.keys(body).length === 0) return badRequest("Empty update body");
      const updated = await updateCollection(admin, collectionId, body, { orgId });
      return ok(updated);
    } catch (err: unknown) {
      console.error("[PATCH /api/content-studio/collections/:id]", err);
      return serverError("Failed to update collection");
    }
  });
};

/** DELETE /api/content-studio/collections/[collectionId] */
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) => {
  const { collectionId } = await params;
  return withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const { collection, assets } = await collectCollectionAssets(admin, collectionId, { orgId });

      const s3Keys: string[] = [];
      let bytesRecovered = 0;
      if (collection?.cover_path) s3Keys.push(collection.cover_path);
      for (const a of assets) {
        if (a.s3_key) s3Keys.push(a.s3_key);
        if (a.thumbnail_path) s3Keys.push(a.thumbnail_path);
        bytesRecovered += Number(a.file_size_bytes) || 0;
      }

      if (s3Keys.length > 0) await deleteS3Objects(s3Keys);
      await deleteCollection(admin, collectionId, { orgId });
      if (bytesRecovered > 0) await recoverOrgStorage(orgId, bytesRecovered);

      return ok({ success: true, deletedAssets: assets.length });
    } catch (err: unknown) {
      console.error("[DELETE /api/content-studio/collections/:id]", err);
      return serverError("Failed to delete collection");
    }
  });
};
