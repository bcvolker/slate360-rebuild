import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { assertDigitalTwinProcessingEntitlement } from "@/lib/twin/processing-entitlement";
import { assertStorageQuota, StorageQuotaExceededError } from "@/lib/twin/storage-quota";
import {
  createUnifiedFileForTwinAsset,
  markUnifiedFileReady,
} from "@/lib/twin/unified-files-bridge";
import { bridgeTwinAssetToSlateDrop } from "@/lib/twin/slatedrop-bridge";
import {
  buildTwinStorageKey,
  inferTwinAssetKind,
  markCaptureUploadedIfReady,
  resolveOrCreateCapture,
  resolveTwinSpace,
  TWIN_SINGLE_UPLOAD_MAX_BYTES,
  type TwinGpsFix,
} from "@/lib/twin/upload-helpers";

export const runtime = "nodejs";

type PresignBody = {
  phase: "presign";
  space_id: string;
  project_id: string;
  capture_id?: string;
  title?: string;
  gps?: TwinGpsFix;
  filename: string;
  contentType: string;
  sizeBytes: number;
  assetKind?: string;
  sortOrder?: number;
};

type FinalizeBody = {
  phase: "finalize";
  assetId: string;
  key: string;
  sizeBytes: number;
};

type SingleBody = PresignBody | FinalizeBody;

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as SingleBody | null;
    if (!body?.phase) return badRequest("phase is required");

    try {
      if (body.phase === "presign") {
        if (!body.space_id || !body.project_id || !body.filename || !body.contentType || !body.sizeBytes) {
          return badRequest("space_id, project_id, filename, contentType, and sizeBytes are required");
        }
        if (body.sizeBytes > TWIN_SINGLE_UPLOAD_MAX_BYTES) {
          return badRequest("File exceeds single-upload limit — use multipart init");
        }

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

        await assertStorageQuota(admin, orgId, body.sizeBytes);

        const storageKey = buildTwinStorageKey(orgId, body.space_id, capture.id, body.filename);
        const assetKind = inferTwinAssetKind(body.contentType, body.filename, body.assetKind);

        const { data: asset, error: assetError } = await admin
          .from("digital_twin_capture_assets")
          .insert({
            org_id: orgId,
            space_id: body.space_id,
            capture_id: capture.id,
            asset_kind: assetKind,
            upload_tier: "standard",
            content_type: body.contentType,
            file_size_bytes: body.sizeBytes,
            status: "uploading",
            sort_order: body.sortOrder ?? 0,
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
          fileName: body.filename,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
          storageKey,
          uploadedBy: user.id,
        });

        await admin
          .from("digital_twin_captures")
          .update({ capture_status: "uploading" })
          .eq("id", capture.id);

        const signedUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: storageKey,
            ContentType: body.contentType,
            ContentLength: body.sizeBytes,
          }),
          { expiresIn: 900 },
        );

        return ok({
          captureId: capture.id,
          assetId: asset.id,
          key: storageKey,
          signedUrl,
        });
      }

      if (body.phase === "finalize") {
        if (!body.assetId || !body.key || !body.sizeBytes) {
          return badRequest("assetId, key, and sizeBytes are required");
        }

        const { data: asset, error: assetError } = await admin
          .from("digital_twin_capture_assets")
          .select("id, capture_id, storage_key, file_size_bytes, unified_file_id, status, asset_kind, content_type")
          .eq("id", body.assetId)
          .eq("org_id", orgId)
          .maybeSingle();

        if (assetError) return serverError(assetError.message);
        if (!asset) return badRequest("Asset not found");
        if (asset.status === "ready") {
          return ok({ assetId: asset.id, captureId: asset.capture_id, alreadyFinalized: true });
        }

        await admin
          .from("digital_twin_capture_assets")
          .update({
            storage_key: body.key,
            file_size_bytes: body.sizeBytes,
            status: "ready",
          })
          .eq("id", asset.id);

        if (asset.unified_file_id) {
          await markUnifiedFileReady(admin, asset.unified_file_id, body.key, body.sizeBytes);
        }

        const { error: storageError } = await admin.rpc("increment_org_storage", {
          target_org_id: orgId,
          bytes_delta: body.sizeBytes,
        });

        if (storageError) {
          console.error("[upload/single] increment_org_storage failed:", storageError.message);
        }

        await markCaptureUploadedIfReady(admin, asset.capture_id, orgId);

        const { data: capture } = await admin
          .from("digital_twin_captures")
          .select("project_id, created_by")
          .eq("id", asset.capture_id)
          .eq("org_id", orgId)
          .maybeSingle();

        if (capture?.project_id) {
          const fileName = body.key.split("/").pop() ?? "asset.bin";
          await bridgeTwinAssetToSlateDrop(admin, {
            assetId: asset.id,
            storageKey: body.key,
            fileName,
            contentType: asset.content_type,
            fileSize: body.sizeBytes,
            assetKind: asset.asset_kind,
            projectId: capture.project_id,
            orgId,
            userId: user.id,
          });
        }

        return ok({
          assetId: asset.id,
          captureId: asset.capture_id,
          storageKey: body.key,
          bytesMetered: body.sizeBytes,
        });
      }

      return badRequest("Unknown phase");
    } catch (err) {
      if (err instanceof StorageQuotaExceededError) return forbidden(err.message);
      const message = err instanceof Error ? err.message : "Single upload failed";
      if (message.includes("Digital Twin access required")) return forbidden(message);
      console.error("[POST /api/digital-twin/upload/single]", err);
      return serverError(message);
    }
  });
