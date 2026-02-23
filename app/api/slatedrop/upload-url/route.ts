/**
 * POST /api/slatedrop/upload-url
 * Returns a presigned S3 PUT URL + a pending file record ID (slatedrop_uploads).
 * The client uploads directly to S3, then calls /api/slatedrop/complete.
 *
 * Body: { filename, contentType, size, folderId, folderPath }
 * DB table: slatedrop_uploads (file_name, file_size, file_type, s3_key, org_id, uploaded_by, status)
 * Folder is encoded in s3_key = "orgs/{namespace}/{folderId}/..." — no UUID folder_id needed.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { resolveNamespace, buildCanonicalS3Key } from "@/lib/slatedrop/storage";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const body = await req.json();
  const { filename, contentType, size, folderId, folderPath, publicToken } = body as {
    filename: string;
    contentType: string;
    size: number;
    folderId: string;
    folderPath: string;
    publicToken?: string;
  };

  if (!filename || !contentType || !folderId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let effectiveFolderId = folderId;
  let effectiveOrgId: string | null = null;
  let effectiveUploadedBy: string | null = user?.id ?? null;

  if (publicToken) {
    const { data: linkRow } = await admin
      .from("project_external_links")
      .select("project_id, folder_id, created_by, expires_at")
      .eq("token", publicToken)
      .maybeSingle();

    if (!linkRow) {
      return NextResponse.json({ error: "Invalid upload token" }, { status: 403 });
    }

    if (linkRow.expires_at && new Date(linkRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Upload token expired" }, { status: 403 });
    }

    const { data: project } = await admin
      .from("projects")
      .select("org_id")
      .eq("id", linkRow.project_id)
      .single();

    effectiveFolderId = linkRow.folder_id;
    effectiveOrgId = project?.org_id ?? null;
    effectiveUploadedBy = linkRow.created_by;
  } else {
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const { data } = await admin
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      effectiveOrgId = data?.org_id ?? null;
    } catch {
      // no org — use user id namespace fallback
    }
  }

  if (!effectiveUploadedBy) {
    return NextResponse.json({ error: "Unable to resolve uploader" }, { status: 400 });
  }

  const namespace = resolveNamespace(effectiveOrgId, effectiveUploadedBy);

  const s3Key = buildCanonicalS3Key(namespace, effectiveFolderId, filename);

  // Generate presigned URL (15 min expiry)
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: contentType,
    ContentLength: size,
  });

  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
  } catch (err) {
    console.error("[upload-url] S3 error:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }

  // Insert a pending record into slatedrop_uploads
  // folder is encoded in s3_key as: orgs/{namespace}/{folderId}/...
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const { data: fileRecord, error: dbError } = await admin
    .from("slatedrop_uploads")
    .insert({
      file_name: filename,
      file_size: size,
      file_type: ext,
      s3_key: s3Key,
      org_id: effectiveOrgId,
      uploaded_by: effectiveUploadedBy,
      status: "pending",
      // folder_id is a UUID FK in DB — we don't use it, filter by s3_key prefix instead
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("[upload-url] Supabase insert error:", dbError);
    return NextResponse.json({ error: "Failed to reserve upload record" }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, fileId: fileRecord.id, s3Key });
}
