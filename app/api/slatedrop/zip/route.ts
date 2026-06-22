/**
 * POST /api/slatedrop/zip
 * Fetches all non-deleted files in a folder from S3, bundles into a ZIP,
 * and returns it as a downloadable application/zip response.
 * Body: { folderId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// @ts-ignore — jszip types may lag
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { folderId } = await req.json() as { folderId: string };
  if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 });

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

  // Find all active files for this folder by s3_key prefix
  const namespace = orgId ?? user.id;
  const s3Prefix = `orgs/${namespace}/${folderId}/`;

  let query = admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_size, s3_key")
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

  // The whole archive is assembled in memory, so guard against requests large
  // enough to OOM the function; over the limit the client should download files
  // individually. (A true streaming archive is a follow-up needing runtime
  // validation.)
  const MAX_TOTAL_BYTES = 1_500_000_000; // ~1.5 GB
  const MAX_FILE_COUNT = 1000;
  const totalBytes = files.reduce((sum, f) => sum + (f.file_size ?? 0), 0);
  if (files.length > MAX_FILE_COUNT || totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "This folder is too large to zip. Download files individually instead." },
      { status: 413 },
    );
  }

  const zip = new JSZip();
  const bucket = BUCKET!;

  // Fetch with a bounded number in flight so we don't pull every file into
  // memory at once (the original Promise.all spiked memory for big folders).
  const FETCH_CONCURRENCY = 4;
  let cursor = 0;
  const fetchOne = async (file: { file_name: string; s3_key: string }) => {
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
  };
  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, files.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= files.length) break;
        await fetchOne(files[i]);
      }
    }),
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
