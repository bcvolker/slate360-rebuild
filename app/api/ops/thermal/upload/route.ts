import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { buildThermalRawKey } from "@/lib/thermal/storage-keys";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

const MAX_BYTES = 120 * 1024 * 1024;

type PresignBody = {
  phase: "presign";
  sessionId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

type FinalizeBody = {
  phase: "finalize";
  captureId: string;
  storagePath: string;
  sizeBytes: number;
};

type UploadBody = PresignBody | FinalizeBody;

export const POST = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ user, admin, orgId, req: request }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await request.json().catch(() => null)) as UploadBody | null;
    if (!body?.phase) return badRequest("phase is required");

    if (body.phase === "presign") {
      if (!body.sessionId || !body.filename || !body.contentType || !body.sizeBytes) {
        return badRequest("sessionId, filename, contentType, and sizeBytes are required");
      }
      if (body.sizeBytes > MAX_BYTES) return badRequest("File exceeds 120 MB limit");

      const { data: session } = await admin
        .from("thermal_analysis_sessions")
        .select("id, org_id")
        .eq("id", body.sessionId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!session) return notFound("Session not found");

      const { data: capture, error: captureError } = await admin
        .from("thermal_captures")
        .insert({
          session_id: body.sessionId,
          org_id: orgId,
          storage_path: "",
          filename: body.filename,
          content_type: body.contentType,
          file_size_bytes: body.sizeBytes,
        })
        .select("id")
        .single();

      if (captureError || !capture) {
        return serverError(captureError?.message ?? "Failed to create capture row");
      }

      const storagePath = buildThermalRawKey(orgId, body.sessionId, capture.id, body.filename);

      await admin
        .from("thermal_captures")
        .update({ storage_path: storagePath })
        .eq("id", capture.id);

      await admin
        .from("thermal_analysis_sessions")
        .update({ status: "uploading" })
        .eq("id", body.sessionId);

      const signedUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: storagePath,
          ContentType: body.contentType,
          ContentLength: body.sizeBytes,
        }),
        { expiresIn: 900 },
      );

      return ok({ captureId: capture.id, storagePath, signedUrl });
    }

    if (body.phase === "finalize") {
      if (!body.captureId || !body.storagePath || !body.sizeBytes) {
        return badRequest("captureId, storagePath, and sizeBytes are required");
      }

      const { data: capture, error } = await admin
        .from("thermal_captures")
        .select("id, session_id")
        .eq("id", body.captureId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (error) return serverError(error.message);
      if (!capture) return notFound("Capture not found");

      await admin
        .from("thermal_captures")
        .update({
          storage_path: body.storagePath,
          file_size_bytes: body.sizeBytes,
        })
        .eq("id", capture.id);

      return ok({ captureId: capture.id, sessionId: capture.session_id });
    }

    return badRequest("Unknown phase");
  });
