/**
 * GET /api/slatedrop/download?fileId=xxx
 * Returns a presigned S3 GET URL for downloading a file.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

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

  let query = supabase
    .from("slatedrop_files")
    .select("name, s3_key, created_by")
    .eq("id", fileId)
    .eq("is_deleted", false);

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);
  const { data: file, error } = await query.single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: file.s3_key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

  return NextResponse.json({ url });
}
