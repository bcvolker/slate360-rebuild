import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { getModelFiles } from "@/lib/design-studio/queries";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "model/gltf-binary",   // .glb
  "model/gltf+json",     // .gltf
  "model/vnd.usdz+zip",  // .usdz
  "application/octet-stream", // fallback for .glb/.fbx/.obj
  "image/jpeg",
  "image/png",
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/** GET /api/design-studio/models/[modelId]/files — list files */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> },
) => {
  const { modelId } = await params;
  return withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const files = await getModelFiles(admin, modelId);
      return ok(files);
    } catch (err: unknown) {
      console.error("[GET /api/design-studio/models/:id/files]", err);
      return serverError("Failed to fetch model files");
    }
  });
};

/** POST /api/design-studio/models/[modelId]/files — get presigned upload URL */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> },
) => {
  const { modelId } = await params;
  return withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const body = await req.json();
      const { filename, contentType, size } = body as {
        filename: string;
        contentType: string;
        size: number;
      };

      if (!filename || !contentType || !size) return badRequest("Missing required fields");
      if (size > MAX_FILE_SIZE) return badRequest("File exceeds 500MB limit");

      // Check storage quota
      const { data: orgData } = await admin
        .from("organizations")
        .select("tier, org_storage_used_bytes")
        .eq("id", orgId)
        .single();

      if (orgData) {
        const { getEntitlements } = await import("@/lib/entitlements");
        const { data: flags } = await admin
          .from("org_feature_flags")
          .select("*")
          .eq("org_id", orgId)
          .maybeSingle();
        const entitlements = getEntitlements(orgData.tier, { featureFlags: flags || {} });
        const limitBytes = (entitlements.maxStorageGB || 5) * 1024 * 1024 * 1024;
        const currentUsage = Number(orgData.org_storage_used_bytes) || 0;
        if (currentUsage + size > limitBytes) {
          return badRequest("Storage limit exceeded. Please upgrade your plan.");
        }
      }

      const timestamp = Date.now();
      const clean = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const s3Key = `design-studio/${orgId}/${modelId}/${timestamp}_${clean}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        ContentType: contentType,
        ContentLength: size,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
      return ok({ uploadUrl, s3Key, size });
    } catch (err: unknown) {
      console.error("[POST /api/design-studio/models/:id/files]", err);
      return serverError("Failed to initialize upload");
    }
  });
};
