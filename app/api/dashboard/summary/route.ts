import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

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

  let recentFilesQuery = admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_size, file_type, created_at, s3_key")
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(5);

  recentFilesQuery = orgId
    ? recentFilesQuery.eq("org_id", orgId)
    : recentFilesQuery.eq("uploaded_by", user.id);

  const { data: recentFilesData, error: recentFilesError } = await recentFilesQuery;

  if (recentFilesError) {
    return NextResponse.json({ error: recentFilesError.message }, { status: 500 });
  }

  let storageQuery = admin
    .from("slatedrop_uploads")
    .select("file_size")
    .neq("status", "deleted");

  storageQuery = orgId
    ? storageQuery.eq("org_id", orgId)
    : storageQuery.eq("uploaded_by", user.id);

  const { data: storageRows, error: storageError } = await storageQuery;

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const storageUsed = (storageRows ?? []).reduce((sum, row) => {
    const value = Number(row.file_size ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const recentFiles = (recentFilesData ?? []).map((row) => ({
    id: row.id,
    file_name: row.file_name,
    file_size: row.file_size,
    file_type: row.file_type,
    s3_key: row.s3_key,
    created_at: row.created_at,
  }));

  return NextResponse.json({ recentFiles, storageUsed });
}
