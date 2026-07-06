import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { validateSceneFileMeta, checkOrgStorageQuota } from "@/lib/tours/upload-validation";

export const runtime = "nodejs";

// POST /api/tours/[tourId]/scenes/upload
export const POST = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { filename, contentType, size, width, height } = body as {
        filename: string;
        contentType: string;
        size: number;
        width?: number;
        height?: number;
      };

      const metaCheck = validateSceneFileMeta({ filename, contentType, size, width, height });
      if (!metaCheck.ok) {
        return badRequest(metaCheck.error);
      }

      const quotaCheck = await checkOrgStorageQuota(admin, orgId, size);
      if (!quotaCheck.ok) {
        return NextResponse.json(
          {
            error: quotaCheck.error,
            currentUsageBytes: quotaCheck.currentUsageBytes,
            limitBytes: quotaCheck.limitBytes,
            attemptedSizeBytes: quotaCheck.attemptedSizeBytes,
          },
          { status: 429 },
        );
      }

      // Path convention: tours/{orgId}/{tourId}/scenes/{filename}
      // We add a timestamp to prevent overwriting scenes with the same filename (e.g. IMG_001.jpg)
      const timestamp = Date.now();
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const s3Key = `tours/${orgId}/${tourId}/scenes/${timestamp}_${cleanFilename}`;

      // Generate S3 Presigned URL
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        ContentType: contentType,
        ContentLength: size,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

      return ok({ uploadUrl, s3Key, size });
    } catch (err: any) {
      console.error("[POST /api/tours/:id/scenes/upload] Error:", err);
      return serverError("Failed to initialize upload");
    }
  });
};
