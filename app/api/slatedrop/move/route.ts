import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

type MoveBody = {
  fileId: string;
  newFolderId: string;
  newS3KeyPrefix: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
}

function normalizePrefix(prefix: string): string {
  return prefix.replace(/^\/+/, "").replace(/\/+$/, "");
}

function encodeCopySource(bucket: string, key: string): string {
  return `${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { fileId, newFolderId, newS3KeyPrefix } = (await req.json()) as MoveBody;

  if (!fileId || !newFolderId || !newS3KeyPrefix) {
    return NextResponse.json(
      { error: "fileId, newFolderId, and newS3KeyPrefix are required" },
      { status: 400 }
    );
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
    .select("id, file_name, s3_key, uploaded_by, org_id")
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

  const prefix = normalizePrefix(newS3KeyPrefix);
  const safeName = sanitizeFilename(file.file_name ?? "file");
  const newS3Key = `${prefix}/${Date.now()}_${safeName}`;

  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: encodeCopySource(BUCKET, file.s3_key),
        Key: newS3Key,
      })
    );

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: file.s3_key,
      })
    );
  } catch (error) {
    console.error("[slatedrop/move] S3 move failed:", error);
    return NextResponse.json({ error: "Failed to move file in S3" }, { status: 500 });
  }

  const updatePayload: { s3_key: string; folder_id: string | null } = {
    s3_key: newS3Key,
    folder_id: isUuid(newFolderId) ? newFolderId : null,
  };

  let updateQuery = admin.from("slatedrop_uploads").update(updatePayload).eq("id", fileId);
  updateQuery = orgId ? updateQuery.eq("org_id", orgId) : updateQuery.eq("uploaded_by", user.id);

  const { error: updateErr } = await updateQuery;
  if (updateErr) {
    console.error("[slatedrop/move] DB update failed:", updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fileId, newS3Key });
}
