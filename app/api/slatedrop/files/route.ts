/**
 * GET /api/slatedrop/files?folderId=xxx
 * Returns files in a folder for the authenticated user's org.
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

  let query = supabase
    .from("slatedrop_files")
    .select("id, name, size, type, folder_id, folder_path, s3_key, created_by, created_at, modified_at")
    .eq("folder_id", folderId)
    .eq("is_deleted", false)
    .eq("is_pending", false)
    .order("name", { ascending: true });

  if (orgId) {
    query = query.eq("org_id", orgId);
  } else {
    query = query.eq("created_by", user.id);
  }

  const { data: files, error } = await query;

  if (error) {
    console.error("[slatedrop/files] Error:", error.message);
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ files: [] });
  }

  return NextResponse.json({
    files: (files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      folderId: f.folder_id,
      folderPath: f.folder_path,
      s3Key: f.s3_key,
      modified: (f.modified_at ?? f.created_at ?? new Date().toISOString()).slice(0, 10),
    })),
  });
}
