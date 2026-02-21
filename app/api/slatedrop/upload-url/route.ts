/**
 * POST /api/slatedrop/upload-url
 * Returns a presigned S3 PUT URL + a pending file record ID.
 * The client uploads directly to S3, then calls /api/slatedrop/complete.
 *
 * Body: { filename, contentType, size, folderId, folderPath }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET, buildS3Key } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const { data } = await supabase
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

  // Insert a pending record in Supabase
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const { data: fileRecord, error: dbError } = await supabase
    .from("slatedrop_files")
    .insert({
      name: filename,
      size,
      type: ext,
      folder_id: folderId,
      folder_path: folderPath ?? folderId,
      s3_key: s3Key,
      org_id: orgId,
      created_by: user.id,
      is_pending: true,
      is_deleted: false,
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("[upload-url] Supabase insert error:", dbError);
    return NextResponse.json({ error: "Failed to reserve upload record" }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, fileId: fileRecord.id, s3Key });
}
