import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type RecordPartBody = {
  uploadId: string;
  key: string;
  partNumber: number;
  etag: string;
  sizeBytes: number;
};

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const body = (await req.json().catch(() => null)) as RecordPartBody | null;
    if (
      !body?.uploadId ||
      !body.key ||
      !Number.isInteger(body.partNumber) ||
      body.partNumber < 1 ||
      !body.etag ||
      !Number.isFinite(body.sizeBytes) ||
      body.sizeBytes < 0
    ) {
      return badRequest("uploadId, key, partNumber, etag, and sizeBytes are required");
    }

    const { data: session, error: sessionError } = await admin
      .from("digital_twin_multipart_uploads")
      .select("id, storage_key, status, total_parts")
      .eq("id", body.uploadId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (sessionError) return serverError(sessionError.message);
    if (!session) return notFound("Multipart upload not found");
    if (session.storage_key !== body.key) return badRequest("Storage key mismatch");
    if (body.partNumber > session.total_parts) return badRequest("partNumber exceeds total parts");
    if (session.status === "aborted") return badRequest("Upload was aborted");
    if (session.status === "completed") return ok({ alreadyRecorded: true });

    const { error: partError } = await admin
      .from("digital_twin_multipart_parts")
      .upsert(
        {
          multipart_id: session.id,
          part_number: body.partNumber,
          etag: body.etag.replace(/^"|"$/g, ""),
          size_bytes: body.sizeBytes,
          status: "uploaded",
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "multipart_id,part_number" },
      );
    if (partError) return serverError(partError.message);

    const { count, error: countError } = await admin
      .from("digital_twin_multipart_parts")
      .select("part_number", { count: "exact", head: true })
      .eq("multipart_id", session.id)
      .eq("status", "uploaded");
    if (countError) return serverError(countError.message);

    const { error: updateError } = await admin
      .from("digital_twin_multipart_uploads")
      .update({ status: "uploading", completed_parts: count ?? 0 })
      .eq("id", session.id)
      .eq("org_id", orgId);
    if (updateError) return serverError(updateError.message);

    return ok({ recorded: true, completedParts: count ?? 0 });
  });
