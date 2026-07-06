import { NextRequest } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError, unauthorized } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

type AbortBody = { uploadId: string; key: string };

// POST /api/tours/[tourId]/scenes/upload/multipart/abort
export const POST = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    const body = (await req.json().catch(() => null)) as AbortBody | null;
    if (!body?.uploadId || !body.key) {
      return badRequest("uploadId and key are required");
    }

    try {
      const { data: session, error } = await admin
        .from("tour_scene_multipart_uploads")
        .select("id, org_id, tour_id, storage_key, s3_upload_id, status")
        .eq("id", body.uploadId)
        .eq("org_id", orgId)
        .eq("tour_id", tourId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) return serverError(error.message);
      if (!session) return notFound("Multipart upload not found");
      if (session.storage_key !== body.key) return badRequest("Storage key mismatch");

      if (session.status !== "aborted" && session.status !== "completed") {
        try {
          await s3.send(
            new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: body.key, UploadId: session.s3_upload_id }),
          );
        } catch (abortErr) {
          console.warn("[upload/multipart/abort] R2 abort warning:", abortErr);
        }
      }

      await admin
        .from("tour_scene_multipart_uploads")
        .update({ status: "aborted", error_text: "Aborted by user", deleted_at: new Date().toISOString() })
        .eq("id", session.id);

      return ok({ uploadId: session.id, status: "aborted" });
    } catch (err) {
      console.error("[POST /api/tours/:id/scenes/upload/multipart/abort]", err);
      return serverError(err instanceof Error ? err.message : "Failed to abort upload");
    }
  });
};
