import { NextRequest } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError, unauthorized } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { finalizeSceneUpload } from "@/lib/tours/finalize-scene";

export const runtime = "nodejs";

type CompletePart = { partNumber: number; etag: string };
type CompleteBody = { uploadId: string; key: string; title?: string; parts: CompletePart[] };

function normalizeEtag(etag: string): string {
  return etag.replace(/^"|"$/g, "");
}

// POST /api/tours/[tourId]/scenes/upload/multipart/complete
export const POST = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    const body = (await req.json().catch(() => null)) as CompleteBody | null;
    if (!body?.uploadId || !body.key || !body.parts?.length) {
      return badRequest("uploadId, key, and parts are required");
    }

    try {
      const { data: session, error } = await admin
        .from("tour_scene_multipart_uploads")
        .select("id, org_id, tour_id, storage_key, s3_upload_id, status, total_parts, size_bytes, filename")
        .eq("id", body.uploadId)
        .eq("org_id", orgId)
        .eq("tour_id", tourId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) return serverError(error.message);
      if (!session) return notFound("Multipart upload not found");
      if (session.storage_key !== body.key) return badRequest("Storage key mismatch");
      if (session.status === "aborted") return badRequest("Upload was aborted");
      if (session.status === "completed") {
        return ok({ alreadyCompleted: true });
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
            Parts: sortedParts.map((part) => ({ ETag: normalizeEtag(part.etag), PartNumber: part.partNumber })),
          },
        }),
      );

      await admin
        .from("tour_scene_multipart_uploads")
        .update({ status: "completed", completed_parts: sortedParts.length, completed_at: new Date().toISOString() })
        .eq("id", session.id);

      const title = body.title?.trim() || session.filename;
      const { scene, ingestQueued } = await finalizeSceneUpload(admin, {
        tourId,
        orgId,
        title,
        s3Key: session.storage_key,
        size: session.size_bytes,
      });

      return ok({ ...scene, ingestQueued });
    } catch (err) {
      console.error("[POST /api/tours/:id/scenes/upload/multipart/complete]", err);
      return serverError(err instanceof Error ? err.message : "Failed to complete upload");
    }
  });
};
