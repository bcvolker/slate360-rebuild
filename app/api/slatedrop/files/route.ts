/**
 * GET /api/slatedrop/files?folderId=xxx
 * Returns files in a folder from slatedrop_uploads.
 * Folder is detected by s3_key prefix: orgs/{namespace}/{folderId}/...
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const folderId = req.nextUrl.searchParams.get("folderId");
  if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 });

  // Resolve org_id
  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch { /* solo user */ }

  // Build the s3_key prefix for this folder
  // Format: orgs/{namespace}/{folderId}/...
  const namespace = resolveNamespace(orgId, user.id);
  const s3Prefix = `orgs/${namespace}/${folderId}/`;

  const cols = "id, file_name, file_size, file_type, s3_key, uploaded_by, created_at";

  // Regular files live under the folder's s3_key prefix...
  let fileQuery = admin
    .from("slatedrop_uploads")
    .select(cols)
    .eq("status", "active")
    .like("s3_key", `${s3Prefix}%`);
  fileQuery = orgId ? fileQuery.eq("org_id", orgId) : fileQuery.eq("uploaded_by", user.id);

  // ...but deliverable LINK rows have a sentinel s3_key (deliverable:// / twin-deliverable://)
  // with no folder prefix — they're located by folder_id instead, so they were invisible here.
  let linkQuery = admin
    .from("slatedrop_uploads")
    .select(cols)
    .eq("status", "active")
    .eq("folder_id", folderId)
    .in("file_type", ["deliverable", "twin_deliverable"]);
  linkQuery = orgId ? linkQuery.eq("org_id", orgId) : linkQuery.eq("uploaded_by", user.id);

  const [fileRes, linkRes] = await Promise.all([fileQuery, linkQuery]);

  if (fileRes.error) {
    console.error("[slatedrop/files] Error:", fileRes.error.message);
    return NextResponse.json({ files: [] });
  }

  // Merge + de-dupe by id (a row can't be both, but guard anyway), then sort by name.
  const byId = new Map<string, Record<string, unknown>>();
  for (const f of [...(fileRes.data ?? []), ...(linkRes.data ?? [])]) {
    byId.set(f.id as string, f as Record<string, unknown>);
  }
  const merged = Array.from(byId.values()).sort((a, b) =>
    String(a.file_name).localeCompare(String(b.file_name)),
  );

  return NextResponse.json({
    files: merged.map((f) => ({
      id: f.id,
      name: f.file_name,
      size: f.file_size,
      type: (f.file_type as string) ?? "",
      folderId,
      s3Key: f.s3_key,
      modified: ((f.created_at as string) ?? new Date().toISOString()).slice(0, 10),
    })),
  });
}
