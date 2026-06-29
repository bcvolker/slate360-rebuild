/**
 * GET /api/slatedrop/download?fileId=xxx
 * Returns a presigned S3 GET URL for downloading a file.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { isDeliverableSentinel, resolveDeliverableSentinelHref } from "@/lib/slatedrop/deliverable-sentinel";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

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

  let query = admin
    .from("slatedrop_uploads")
    .select("file_name, s3_key, uploaded_by")
    .eq("id", fileId)
    .neq("status", "deleted");

  query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);
  const { data: file, error } = await query.single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Deliverable LINK rows aren't S3 objects — never presign their sentinel key
  // (that produced a NoSuchKey / blank-iframe). Tell the client where to open it.
  if (isDeliverableSentinel(file.s3_key)) {
    return NextResponse.json({ openHref: resolveDeliverableSentinelHref(file.s3_key) });
  }

  const mode = req.nextUrl.searchParams.get("mode"); // "preview" → inline, default → attachment
  const disposition = mode === "preview"
    ? `inline; filename="${encodeURIComponent(file.file_name)}"`
    : `attachment; filename="${encodeURIComponent(file.file_name)}"`;  

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: file.s3_key,
    ResponseContentDisposition: disposition,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

  return NextResponse.json({ url });
}
