import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { getAssets, createAsset } from "@/lib/content-studio/queries";

export const runtime = "nodejs";

/** GET /api/content-studio/assets?collectionId=xxx&mediaType=image */
export const GET = async (req: NextRequest) =>
  withAppAuth("content_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    const collectionId = req.nextUrl.searchParams.get("collectionId") ?? undefined;
    const mediaType = req.nextUrl.searchParams.get("mediaType") ?? undefined;

    try {
      const assets = await getAssets(admin, { orgId }, { collectionId, mediaType });
      return ok(assets);
    } catch (err: unknown) {
      console.error("[GET /api/content-studio/assets]", err);
      return serverError("Failed to fetch assets");
    }
  });

/** POST /api/content-studio/assets */
export const POST = async (req: NextRequest) =>
  withAppAuth("content_studio", req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { collectionId, title, s3Key, contentType, fileSizeBytes, mediaType, tags } =
        body as {
          collectionId?: string;
          title: string;
          s3Key: string;
          contentType: string;
          fileSizeBytes: number;
          mediaType?: string;
          tags?: string[];
        };

      if (!title || !s3Key || !contentType || typeof fileSizeBytes !== "number") {
        return badRequest("title, s3Key, contentType, and fileSizeBytes are required");
      }

      const asset = await createAsset(admin, {
        orgId,
        collectionId,
        uploadedBy: user.id,
        title,
        s3Key,
        contentType,
        fileSizeBytes,
        mediaType,
        tags,
      });

      // Increment storage quota
      const { error: rpcError } = await admin.rpc("increment_org_storage", {
        target_org_id: orgId,
        bytes_delta: fileSizeBytes,
      });
      if (rpcError) {
        console.error("[POST /api/content-studio/assets] quota error:", rpcError);
      }

      return ok(asset);
    } catch (err: unknown) {
      console.error("[POST /api/content-studio/assets]", err);
      return serverError("Failed to create asset");
    }
  });
