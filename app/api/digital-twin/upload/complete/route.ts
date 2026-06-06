import { NextRequest } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { markUnifiedFileReady } from "@/lib/twin/unified-files-bridge";
import { markCaptureUploadedIfReady } from "@/lib/twin/upload-helpers";

export const runtime = "nodejs";

type CompletePart = {
  partNumber: number;
  etag: string;
  sizeBytes?: number;
};

type CompleteBody = {
  uploadId: string;
  key: string;
  parts: CompletePart[];
};

function normalizeEtag(etag: string): string {
  return etag.replace(/^"|"$/g, "");
}

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as CompleteBody | null;
    if (!body?.uploadId || !body.key || !body.parts?.length) {
      return badRequest("uploadId, key, and parts are required");
    }

    try {
      const { data: session, error } = await admin
        .from("digital_twin_multipart_uploads")
        .select("id, org_id, asset_id, storage_key, s3_upload_id, status, total_parts")
        .eq("id", body.uploadId)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) return serverError(error.message);
      if (!session) return notFound("Multipart upload not found");
      if (session.storage_key !== body.key) return badRequest("Storage key mismatch");
      if (session.status === "aborted") return badRequest("Upload was aborted");
      if (session.status === "completed") {
        return ok({ assetId: session.asset_id, alreadyCompleted: true });
      }

      const sortedParts = [...body.parts].sort((a, b) => a.partNumber - b.partNumber);
      if (sortedParts.length !== session.total_parts) {
        return badRequest(`Expected ${session.total_parts} parts, received ${sortedParts.length}`);
      }

      await s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: BUCKET,
          Key: body.key,
          UploadId: session.s3_upload_id,
          MultipartUpload: {
            Parts: sortedParts.map((part) => ({
              ETag: normalizeEtag(part.etag),
              PartNumber: part.partNumber,
            })),
          },
        }),
      );

      const partRows = sortedParts.map((part) => ({
        multipart_id: session.id,
        part_number: part.partNumber,
        etag: normalizeEtag(part.etag),
        size_bytes: part.sizeBytes ?? 0,
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
      }));

      const { error: partsError } = await admin
        .from("digital_twin_multipart_parts")
        .upsert(partRows, { onConflict: "multipart_id,part_number" });

      if (partsError) return serverError(partsError.message);

      const { data: asset, error: assetError } = await admin
        .from("digital_twin_capture_assets")
        .select("id, capture_id, file_size_bytes, unified_file_id")
        .eq("id", session.asset_id)
        .eq("org_id", orgId)
        .single();

      if (assetError || !asset) return serverError(assetError?.message ?? "Asset not found");

      const completedAt = new Date().toISOString();

      await admin
        .from("digital_twin_multipart_uploads")
        .update({
          status: "completed",
          completed_parts: sortedParts.length,
          completed_at: completedAt,
        })
        .eq("id", session.id);

      await admin
        .from("digital_twin_capture_assets")
        .update({
          storage_key: body.key,
          status: "ready",
        })
        .eq("id", asset.id);

      if (asset.unified_file_id) {
        await markUnifiedFileReady(
          admin,
          asset.unified_file_id,
          body.key,
          asset.file_size_bytes,
        );
      }

      const { error: storageError } = await admin.rpc("increment_org_storage", {
        target_org_id: orgId,
        bytes_delta: asset.file_size_bytes,
      });

      if (storageError) {
        console.error("[upload/complete] increment_org_storage failed:", storageError.message);
      }

      await markCaptureUploadedIfReady(admin, asset.capture_id, orgId);

      return ok({
        assetId: asset.id,
        captureId: asset.capture_id,
        storageKey: body.key,
        bytesMetered: asset.file_size_bytes,
      });
    } catch (err) {
      console.error("[POST /api/digital-twin/upload/complete]", err);
      return serverError(err instanceof Error ? err.message : "Failed to complete upload");
    }
  });
