import { NextRequest } from "next/server";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { assertDigitalTwinProcessingEntitlement } from "@/lib/twin/processing-entitlement";
import { assertStorageQuota, StorageQuotaExceededError } from "@/lib/twin/storage-quota";
import { createUnifiedFileForTwinAsset } from "@/lib/twin/unified-files-bridge";
import {
  buildTwinStorageKey,
  inferTwinAssetKind,
  resolveOrCreateCapture,
  resolveTwinSpace,
  TWIN_MULTIPART_PART_BYTES,
  type TwinFileDescriptor,
  type TwinGpsFix,
} from "@/lib/twin/upload-helpers";

export const runtime = "nodejs";

type InitBody = {
  space_id: string;
  project_id: string;
  capture_id?: string;
  title?: string;
  gps?: TwinGpsFix;
  files: TwinFileDescriptor[];
};

function computePartCount(sizeBytes: number): number {
  return Math.max(1, Math.ceil(sizeBytes / TWIN_MULTIPART_PART_BYTES));
}

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as InitBody | null;
    if (!body?.space_id || !body.project_id || !body.files?.length) {
      return badRequest("space_id, project_id, and files are required");
    }

    for (const file of body.files) {
      if (!file.filename || !file.contentType || !file.sizeBytes) {
        return badRequest("Each file requires filename, contentType, and sizeBytes");
      }
      if (file.sizeBytes <= TWIN_MULTIPART_PART_BYTES - 1) {
        return badRequest(`File ${file.filename} is too small for multipart — use /upload/single`);
      }
    }

    try {
      await resolveTwinSpace(admin, orgId, body.space_id, body.project_id);

      const capture = await resolveOrCreateCapture(admin, {
        orgId,
        spaceId: body.space_id,
        projectId: body.project_id,
        userId: user.id,
        captureId: body.capture_id,
        title: body.title,
        gps: body.gps,
      });

      await assertDigitalTwinProcessingEntitlement(admin, {
        orgId,
        userId: user.id,
        userEmail: user.email,
        captureId: capture.id,
      });

      const totalBytes = body.files.reduce((sum, file) => sum + file.sizeBytes, 0);
      await assertStorageQuota(admin, orgId, totalBytes);

      await admin
        .from("digital_twin_captures")
        .update({ capture_status: "uploading" })
        .eq("id", capture.id)
        .eq("org_id", orgId);

      const uploads = [];

      for (let index = 0; index < body.files.length; index++) {
        const file = body.files[index];
        const storageKey = buildTwinStorageKey(orgId, body.space_id, capture.id, file.filename);
        const assetKind = inferTwinAssetKind(file.contentType, file.filename, file.assetKind);
        const totalParts = computePartCount(file.sizeBytes);

        const { data: asset, error: assetError } = await admin
          .from("digital_twin_capture_assets")
          .insert({
            org_id: orgId,
            space_id: body.space_id,
            capture_id: capture.id,
            asset_kind: assetKind,
            upload_tier: "standard",
            content_type: file.contentType,
            file_size_bytes: file.sizeBytes,
            status: "uploading",
            sort_order: index,
          })
          .select("id")
          .single();

        if (assetError || !asset?.id) {
          throw new Error(assetError?.message ?? "Failed to create capture asset");
        }

        await createUnifiedFileForTwinAsset(admin, {
          orgId,
          projectId: body.project_id,
          spaceId: body.space_id,
          captureId: capture.id,
          assetId: asset.id,
          fileName: file.filename,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
          storageKey,
          uploadedBy: user.id,
        });

        const created = await s3.send(
          new CreateMultipartUploadCommand({
            Bucket: BUCKET,
            Key: storageKey,
            ContentType: file.contentType,
          }),
        );

        if (!created.UploadId) throw new Error("S3 did not return an upload id");

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { data: multipart, error: multipartError } = await admin
          .from("digital_twin_multipart_uploads")
          .insert({
            org_id: orgId,
            asset_id: asset.id,
            storage_key: storageKey,
            s3_upload_id: created.UploadId,
            content_type: file.contentType,
            total_parts: totalParts,
            part_size_bytes: TWIN_MULTIPART_PART_BYTES,
            status: "initiated",
            expires_at: expiresAt,
          })
          .select("id")
          .single();

        if (multipartError || !multipart?.id) {
          throw new Error(multipartError?.message ?? "Failed to persist multipart session");
        }

        uploads.push({
          assetId: asset.id,
          uploadId: multipart.id,
          s3UploadId: created.UploadId,
          key: storageKey,
          partSizeBytes: TWIN_MULTIPART_PART_BYTES,
          totalParts,
        });
      }

      return ok({
        captureId: capture.id,
        uploads,
      });
    } catch (err) {
      if (err instanceof StorageQuotaExceededError) {
        return forbidden(err.message);
      }
      const message = err instanceof Error ? err.message : "Upload init failed";
      if (message.includes("Digital Twin access required")) return forbidden(message);
      if (message.includes("Processing already active")) return forbidden(message);
      console.error("[POST /api/digital-twin/upload/init]", err);
      return serverError(message);
    }
  });
