import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";
import { resolveProjectFolderIdByName } from "@/lib/slatedrop/projectArtifacts";
import { provisionProjectFolders } from "@/lib/slatedrop/provisioning";

/** POST /api/site-walk/upload — returns a presigned PUT URL for photo/file upload */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = await req.json();
    const { filename, contentType, sessionId } = body as {
      filename?: string;
      contentType?: string;
      sessionId?: string;
    };

    if (!filename || !contentType || !sessionId) {
      return badRequest("filename, contentType, and sessionId are required");
    }

    // Validate content type (images + common docs)
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowed.includes(contentType)) {
      return badRequest("Unsupported file type");
    }

    const { data: session, error: sessionError } = await admin
      .from("site_walk_sessions")
      .select("id, project_id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (sessionError || !session?.project_id) {
      return badRequest("Session not found or access denied");
    }

    let folderId = await resolveProjectFolderIdByName(
      session.project_id,
      "Photos",
      orgId,
      user.id,
    );

    if (!folderId) {
      const { data: project } = await admin
        .from("projects")
        .select("name")
        .eq("id", session.project_id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (!project?.name) {
        return badRequest("Project not found for session");
      }

      await provisionProjectFolders(session.project_id, project.name, orgId, user.id);
      folderId = await resolveProjectFolderIdByName(session.project_id, "Photos", orgId, user.id);
    }

    if (!folderId) {
      return serverError("Project Photos folder is unavailable");
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const namespace = resolveNamespace(orgId, user.id);
    const key = buildCanonicalS3Key(namespace, folderId, filename);

    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min

      const { data: fileRecord, error: reserveError } = await admin
        .from("slatedrop_uploads")
        .insert({
          file_name: filename,
          file_size: 0,
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
