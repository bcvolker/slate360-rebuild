/**
 * GET /api/slatedrop/files?folderId=xxx
 * Returns files in a folder from slatedrop_uploads.
 * Folder is detected by s3_key prefix: orgs/{namespace}/{folderId}/...
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get("folderId");
  if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 });

  // Resolve org_id
  let orgId: string | null = null;
  try {
    const { data } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch { /* solo user */ }

  // Build the s3_key prefix for this folder
  // Format: orgs/{orgId ?? userId}/{folderId}/...
  const namespace = orgId ?? user.id;
  const s3Prefix = `orgs/${namespace}/${folderId}/`;

  let query = supabase
    .from("slatedrop_uploads")
    .select("id, file_name, file_size, file_type, s3_key, uploaded_by, created_at")
    .eq("status", "active")
    .like("s3_key", `${s3Prefix}%`)
    .order("file_name", { ascending: true });

  if (orgId) {
    query = query.eq("org_id", orgId);
  } else {
    query = query.eq("uploaded_by", user.id);
  }

  const { data: files, error } = await query;

  if (error) {
    console.error("[slatedrop/files] Error:", error.message);
    // Table error — return empty gracefully
    return NextResponse.json({ files: [] });
  }

  return NextResponse.json({
    files: (files ?? []).map((f) => ({
      id: f.id,
      name: f.file_name,
      size: f.file_size,
      type: f.file_type ?? "",
      folderId,
      s3Key: f.s3_key,
      modified: (f.created_at ?? new Date().toISOString()).slice(0, 10),
    })),
  });
}
