import { NextRequest } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

type AbortBody = {
  uploadId: string;
  key: string;
};

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as AbortBody | null;
    if (!body?.uploadId || !body.key) {
      return badRequest("uploadId and key are required");
    }

    try {
      const { data: session, error } = await admin
        .from("digital_twin_multipart_uploads")
        .select("id, org_id, asset_id, storage_key, s3_upload_id, status")
        .eq("id", body.uploadId)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) return serverError(error.message);
      if (!session) return notFound("Multipart upload not found");
      if (session.storage_key !== body.key) return badRequest("Storage key mismatch");

      if (session.status !== "aborted" && session.status !== "completed") {
        try {
          await s3.send(
            new AbortMultipartUploadCommand({
              Bucket: BUCKET,
              Key: body.key,
              UploadId: session.s3_upload_id,
            }),
          );
        } catch (abortErr) {
          console.warn("[upload/abort] S3 abort warning:", abortErr);
        }
      }

      const now = new Date().toISOString();

      await admin
        .from("digital_twin_multipart_uploads")
        .update({
          status: "aborted",
          error_text: "Aborted by user",
          deleted_at: now,
          deleted_by: user.id,
        })
        .eq("id", session.id);

      await admin
        .from("digital_twin_capture_assets")
        .update({
          status: "failed",
          error_text: "Upload aborted",
        })
        .eq("id", session.asset_id)
        .eq("org_id", orgId);

      return ok({ uploadId: session.id, assetId: session.asset_id, status: "aborted" });
    } catch (err) {
      console.error("[POST /api/digital-twin/upload/abort]", err);
      return serverError(err instanceof Error ? err.message : "Failed to abort upload");
    }
  });
