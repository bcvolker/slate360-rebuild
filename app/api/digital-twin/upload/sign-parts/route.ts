import { NextRequest } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

type SignPartsBody = {
  uploadId: string;
  key: string;
  partNumbers: number[];
};

// 6 hours (vs 15 min on /sign-part): the native background uploader signs every part
// upfront and lets iOS drive the PUTs while the app is locked or suspended — the URLs
// must outlive multi-hour background transfer schedules. R2/S3 allows up to 7 days.
const EXPIRES_SECONDS = 6 * 60 * 60;
const MAX_BATCH = 500;

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as SignPartsBody | null;
    if (!body?.uploadId || !body.key || !Array.isArray(body.partNumbers) || !body.partNumbers.length) {
      return badRequest("uploadId, key, and partNumbers are required");
    }
    if (body.partNumbers.length > MAX_BATCH) {
      return badRequest(`At most ${MAX_BATCH} parts per request`);
    }
    if (body.partNumbers.some((n) => !Number.isInteger(n) || n < 1 || n > 10_000)) {
      return badRequest("partNumbers out of range");
    }

    try {
      const { data: session, error } = await admin
        .from("digital_twin_multipart_uploads")
        .select("id, org_id, storage_key, s3_upload_id, status, total_parts")
        .eq("id", body.uploadId)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) return serverError(error.message);
      if (!session) return notFound("Multipart upload not found");
      if (session.status === "aborted" || session.status === "completed") {
        return badRequest(`Upload session is ${session.status}`);
      }
      if (session.storage_key !== body.key) return badRequest("Storage key mismatch");
      if (body.partNumbers.some((n) => n > session.total_parts)) {
        return badRequest("partNumber exceeds total parts");
      }

      const parts = await Promise.all(
        body.partNumbers.map(async (partNumber) => ({
          partNumber,
          signedUrl: await getSignedUrl(
            s3,
            new UploadPartCommand({
              Bucket: BUCKET,
              Key: body.key,
              UploadId: session.s3_upload_id,
              PartNumber: partNumber,
            }),
            { expiresIn: EXPIRES_SECONDS },
          ),
        })),
      );

      if (session.status === "initiated") {
        await admin
          .from("digital_twin_multipart_uploads")
          .update({ status: "uploading" })
          .eq("id", session.id);
      }

      return ok({ parts, expiresInSeconds: EXPIRES_SECONDS });
    } catch (err) {
      console.error("[POST /api/digital-twin/upload/sign-parts]", err);
      return serverError(err instanceof Error ? err.message : "Failed to sign upload parts");
    }
  });
