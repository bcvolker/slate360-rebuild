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
import { s3, BUCKET, buildS3Key } from "@/lib/s3";

export async function POST(req: NextRequest) {
  // Auth check via cookie-based client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin client for DB operations (bypasses RLS)
  const admin = createAdminClient();

  const body = await req.json();
  const { filename, contentType, size, folderId, folderPath } = body as {
    filename: string;
    contentType: string;
    size: number;
    folderId: string;
    folderPath: string;
  };

  if (!filename || !contentType || !folderId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Resolve org_id
  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch { /* no org — use user id as namespace */ }
  const namespace = orgId ?? user.id;

  const s3Key = buildS3Key(namespace, folderId, filename);

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
      org_id: orgId,
      uploaded_by: user.id,
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
