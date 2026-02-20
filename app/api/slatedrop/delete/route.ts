/**
 * DELETE /api/slatedrop/delete
 * Soft-deletes a file from Supabase + hard-deletes from S3.
 * Body: { fileId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await req.json() as { fileId: string };
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  // Fetch file to get s3_key
  const { data: file, error: fetchErr } = await supabase
    .from("slatedrop_files")
    .select("s3_key, created_by")
    .eq("id", fileId)
    .single();

  if (fetchErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Soft-delete in Supabase
  await supabase
    .from("slatedrop_files")
    .update({ is_deleted: true })
    .eq("id", fileId);

  // Hard-delete from S3 (best-effort)
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3_key }));
  } catch (err) {
    console.error("[slatedrop/delete] S3 delete failed:", err);
    // Don't fail the whole request — Supabase record is already soft-deleted
  }

  return NextResponse.json({ ok: true });
}
