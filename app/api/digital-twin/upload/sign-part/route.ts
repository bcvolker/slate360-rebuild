import { NextRequest } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

type SignPartBody = {
  uploadId: string;
  key: string;
  partNumber: number;
};

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as SignPartBody | null;
    if (!body?.uploadId || !body.key || !body.partNumber) {
      return badRequest("uploadId, key, and partNumber are required");
    }
    if (body.partNumber < 1 || body.partNumber > 10_000) {
      return badRequest("partNumber out of range");
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
      if (body.partNumber > session.total_parts) return badRequest("partNumber exceeds total parts");

      const signedUrl = await getSignedUrl(
        s3,
        new UploadPartCommand({
          Bucket: BUCKET,
          Key: body.key,
          UploadId: session.s3_upload_id,
          PartNumber: body.partNumber,
        }),
        { expiresIn: 900 },
      );

      if (session.status === "initiated") {
        await admin
          .from("digital_twin_multipart_uploads")
          .update({ status: "uploading" })
          .eq("id", session.id);
      }

      return ok({ signedUrl, partNumber: body.partNumber });
    } catch (err) {
      console.error("[POST /api/digital-twin/upload/sign-part]", err);
      return serverError(err instanceof Error ? err.message : "Failed to sign upload part");
    }
  });
