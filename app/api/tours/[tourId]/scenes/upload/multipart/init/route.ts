import { NextRequest, NextResponse } from "next/server";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { validateSceneFileMeta, checkOrgStorageQuota } from "@/lib/tours/upload-validation";

export const runtime = "nodejs";

const PART_BYTES = 8 * 1024 * 1024; // matches lib/twin/upload-constants.ts convention
const MAX_PARTS = 10_000; // R2/S3 hard limit

type InitBody = {
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
};

// POST /api/tours/[tourId]/scenes/upload/multipart/init
// Chunked/resumable counterpart to /scenes/upload, for the mobile import flow —
// cellular connections drop mid-upload far more often than desktop broadband,
// so uploads are split into 8 MiB parts the client can retry individually
// instead of restarting a single multi-megabyte PUT from scratch.
export const POST = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = (await req.json()) as InitBody;
      const { filename, contentType, size, width, height } = body;

      const metaCheck = validateSceneFileMeta({ filename, contentType, size, width, height });
      if (!metaCheck.ok) return badRequest(metaCheck.error);

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

      const totalParts = Math.max(1, Math.ceil(size / PART_BYTES));
      if (totalParts > MAX_PARTS) {
        return badRequest("File is too large for multipart upload");
      }

      const timestamp = Date.now();
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const storageKey = `tours/${orgId}/${tourId}/scenes/${timestamp}_${cleanFilename}`;

      const created = await s3.send(
        new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: storageKey, ContentType: contentType }),
      );
      if (!created.UploadId) throw new Error("R2 did not return an upload id");

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: session, error } = await admin
        .from("tour_scene_multipart_uploads")
        .insert({
          org_id: orgId,
          tour_id: tourId,
          storage_key: storageKey,
          s3_upload_id: created.UploadId,
          content_type: contentType,
          filename,
          size_bytes: size,
          total_parts: totalParts,
          part_size_bytes: PART_BYTES,
          status: "initiated",
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (error || !session) {
        throw new Error(error?.message ?? "Failed to persist multipart session");
      }

      return ok({
        uploadId: session.id,
        s3UploadId: created.UploadId,
        key: storageKey,
        partSizeBytes: PART_BYTES,
        totalParts,
      });
    } catch (err) {
      console.error("[POST /api/tours/:id/scenes/upload/multipart/init]", err);
      return serverError(err instanceof Error ? err.message : "Failed to initiate upload");
    }
  });
};
