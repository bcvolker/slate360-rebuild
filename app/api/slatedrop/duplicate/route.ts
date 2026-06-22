/**
 * POST /api/slatedrop/duplicate
 * Duplicates a file: copies the S3 object to a new canonical key and inserts a
 * new slatedrop_uploads row in the same folder (" copy" appended to the name).
 *
 * Body: { fileId }
 */
import { NextRequest, NextResponse } from "next/server";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { s3, BUCKET } from "@/lib/s3";
import { resolveNamespace, buildCanonicalS3Key } from "@/lib/slatedrop/storage";
import { ensureUnifiedFileForUpload } from "@/lib/slatedrop/unified-files";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";

function encodeCopySource(bucket: string, key: string): string {
  return `${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

function copyName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name} copy`;
  return `${name.slice(0, dot)} copy${name.slice(dot)}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { fileId } = (await req.json().catch(() => ({}))) as { fileId?: string };
  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    // solo user fallback
  }

  const { data: file, error: fileErr } = await admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_size, file_type, s3_key, uploaded_by, org_id, folder_id")
    .eq("id", fileId)
    .neq("status", "deleted")
    .single();

  if (fileErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const authorized = orgId ? file.org_id === orgId : file.uploaded_by === user.id;
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newName = copyName(file.file_name ?? "file");
  const namespace = resolveNamespace(orgId, user.id);
  // Mirror the original's folder segment so the copy lands beside it. The
  // canonical key includes the file name, so " copy" keeps it from clobbering.
  const folderSegment = file.s3_key.split("/").slice(2, -1).join("/") || (file.folder_id ?? "root");
  const newS3Key = buildCanonicalS3Key(namespace, folderSegment, newName);

  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: encodeCopySource(BUCKET, file.s3_key),
        Key: newS3Key,
      }),
    );
  } catch (error) {
    console.error("[slatedrop/duplicate] S3 copy failed:", error);
    return NextResponse.json({ error: "Failed to copy file in S3" }, { status: 500 });
  }

  const { data: inserted, error: insertErr } = await admin
    .from("slatedrop_uploads")
    .insert({
      file_name: newName,
      file_size: file.file_size,
      file_type: file.file_type,
      s3_key: newS3Key,
      org_id: file.org_id,
      uploaded_by: user.id,
      status: "active",
      folder_id: file.folder_id,
    })
    .select("id, file_name, file_size, file_type, s3_key, org_id, uploaded_by, status, folder_id, created_at, unified_file_id")
    .single();

  if (insertErr || !inserted) {
    console.error("[slatedrop/duplicate] DB insert failed:", insertErr?.message);
    return NextResponse.json({ error: insertErr?.message ?? "Failed to create copy" }, { status: 500 });
  }

  try {
    await ensureUnifiedFileForUpload(admin, inserted);
    if (file.org_id) await trackStorageUsed(admin, file.org_id, inserted.id);
  } catch (error) {
    console.error("[slatedrop/duplicate] post-insert bookkeeping failed:", error);
    // The copy exists and is usable; bookkeeping is best-effort.
  }

  return NextResponse.json({ ok: true, fileId: inserted.id, fileName: newName });
}
