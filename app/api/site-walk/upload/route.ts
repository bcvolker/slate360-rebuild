import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";
import { checkStorageLimit, meteringBlockedResponse } from "@/lib/site-walk/metering";
import { ensureSiteWalkProjectFolder } from "@/lib/site-walk/slatedrop-folders";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

/** POST /api/site-walk/upload — returns a presigned PUT URL for photo/file upload */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = await req.json();
    const { filename, contentType, sessionId, fileSizeBytes } = body as {
      filename?: string;
      contentType?: string;
      sessionId?: string;
      fileSizeBytes?: number;
    };

    if (!filename || !contentType || !sessionId) {
      return badRequest("filename, contentType, and sessionId are required");
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return badRequest("Unsupported file type");
    }

    if (typeof fileSizeBytes === "number" && fileSizeBytes > MAX_FILE_BYTES) {
      return badRequest("File must be 25MB or smaller");
    }

    const { data: session, error: sessionError } = await admin
      .from("site_walk_sessions")
      .select("id, project_id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (sessionError || !session) {
      return badRequest("Session not found or access denied");
    }

    const requestedBytes = Number.isFinite(fileSizeBytes) ? Math.max(0, fileSizeBytes ?? 0) : 0;
    const storageCheck = await checkStorageLimit(admin, orgId, requestedBytes);
    const blocked = meteringBlockedResponse(storageCheck);
    if (blocked) return blocked;

    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const namespace = resolveNamespace(orgId, user.id);
    const folderId = session.project_id
      ? await ensureSiteWalkProjectFolder({
          admin,
          projectId: session.project_id,
          orgId,
          userId: user.id,
          childName: "Photos",
        })
      : null;
    const key = folderId
      ? buildCanonicalS3Key(namespace, folderId, filename)
      : `orgs/${namespace}/site-walk-files/ad-hoc/${session.id}/photos/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        ContentLength: requestedBytes || undefined,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min

      const { data: fileRecord, error: reserveError } = await admin
        .from("slatedrop_uploads")
        .insert({
          file_name: filename,
          file_size: requestedBytes,
          file_type: ext,
          s3_key: key,
          folder_id: folderId,
          org_id: orgId,
          uploaded_by: user.id,
          status: "pending",
        })
        .select("id")
        .single();

      if (reserveError || !fileRecord) {
        console.error("[site-walk-upload] reserve failed:", reserveError);
        return serverError("Failed to reserve SlateDrop upload record");
      }

      return ok({ uploadUrl, s3Key: key, fileId: fileRecord.id });
    } catch (err) {
      console.error("[site-walk-upload]", err);
      return serverError("Failed to generate upload URL");
    }
  });
