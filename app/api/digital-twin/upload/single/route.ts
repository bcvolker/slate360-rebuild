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
import { upsertTwinCaptureAsset } from "@/lib/twin/upsert-capture-asset";
import {
  buildTwinStorageKey,
  inferTwinAssetKind,
  isExternalTwinLidarScanFilename,
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
  /** P0a — stable client identity so re-submits reuse the asset row. */
  clientFingerprint?: string;
  sortOrder?: number;
};

type FinalizeBody = {
  phase: "finalize";
  assetId: string;
  key: string;
  sizeBytes: number;
};

/** Client-side upload gave up (retries exhausted) — record why so the row is never a
 *  silent `uploading`/NULL-key mystery. The asset may still recover: the native
 *  engine keeps its manifest on disk and re-uploads on next app launch, and finalize/
 *  complete flip the row back to `ready` when the bytes eventually land. */
type FailBody = {
  phase: "fail";
  assetId: string;
  error?: string;
};

type SingleBody = PresignBody | FinalizeBody | FailBody;

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
        const isExternalLidarScan = isExternalTwinLidarScanFilename(body.filename);
        if (isExternalLidarScan && body.assetKind !== "lidar_scan") {
          return badRequest(
            `${body.filename} requires the dedicated LiDAR scan upload role`,
          );
        }
        if (body.assetKind === "lidar_scan" && !isExternalLidarScan) {
          return badRequest("LiDAR scan uploads must be LAS, LAZ, or E57 files");
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

        // P0a — idempotent registration. A retry / refresh / re-entry into the submit flow
        // used to insert a fresh row for the same file; one 262.9 MB video registered three
        // times and the job then ran on the incomplete triplicate set. Reuse the live row
        // when the client supplies a fingerprint.
        const asset = await upsertTwinCaptureAsset(admin, {
          orgId,
          spaceId: body.space_id,
          captureId: capture.id,
          assetKind,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
          sortOrder: body.sortOrder ?? 0,
          clientFingerprint: body.clientFingerprint ?? null,
        });

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

      if (body.phase === "fail") {
        if (!body.assetId) return badRequest("assetId is required");

        const { data: asset, error: assetError } = await admin
          .from("digital_twin_capture_assets")
          .select("id, capture_id, status")
          .eq("id", body.assetId)
          .eq("org_id", orgId)
          .maybeSingle();

        if (assetError) return serverError(assetError.message);
        if (!asset) return badRequest("Asset not found");
        // Never walk a finished upload backwards — a late/duplicate failure report
        // must not clobber a row whose bytes already landed.
        if (asset.status === "ready") {
          return ok({ assetId: asset.id, status: "ready", ignored: true });
        }

        const errorText = (body.error ?? "Upload failed on device").slice(0, 500);
        await admin
          .from("digital_twin_capture_assets")
          .update({ status: "failed", error_text: errorText })
          .eq("id", asset.id);

        // The failing asset almost always settles LAST (its retries outlive every
        // successful sibling's finalize), so this report is the capture's final
        // settle event — without re-checking here the capture would sit in
        // `uploading` forever, which is the exact stranded state this phase exists
        // to prevent.
        await markCaptureUploadedIfReady(admin, asset.capture_id, orgId);

        return ok({ assetId: asset.id, status: "failed" });
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
