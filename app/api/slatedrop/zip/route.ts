/**
 * POST /api/slatedrop/zip
 * Fetches all non-deleted files in a folder from S3, bundles into a ZIP,
 * and returns it as a downloadable application/zip response.
 * Body: { folderId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// @ts-ignore — jszip types may lag
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { folderId } = await req.json() as { folderId: string };
  if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 });

  let orgId: string | null = null;
  try {
    const { data } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    // solo user fallback
  }

  // Find all active files for this folder by s3_key prefix
  const namespace = orgId ?? user.id;
  const s3Prefix = `orgs/${namespace}/${folderId}/`;

  let query = supabase
    .from("slatedrop_uploads")
    .select("id, file_name, s3_key")
    .eq("status", "active")
    .like("s3_key", `${s3Prefix}%`);

  query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);
  const { data: files, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files to download" }, { status: 404 });
  }

  const zip = new JSZip();
  const bucket = BUCKET!;

  await Promise.all(
    files.map(async (file) => {
      try {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: file.s3_key });
        const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
        const res = await fetch(url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        zip.file(file.file_name, buffer);
      } catch (e) {
        console.warn(`[zip] skipped ${file.file_name}:`, e);
      }
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const uint8 = new Uint8Array(zipBuffer);

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="slatedrop-${folderId}.zip"`,
      "Content-Length": String(uint8.length),
    },
  });
}
