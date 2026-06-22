/**
 * GET /api/slatedrop/deleted
 * Lists soft-deleted files still inside the 30-day recovery window, scoped to
 * the caller's org (or their own files when solo). Powers a "Recently deleted"
 * / trash view; restore is handled by POST /api/slatedrop/restore.
 *
 * Optional query: ?folderId=… filters to files originally in that folder
 * (matched by s3_key prefix, the same scheme the listing + zip routes use).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    // solo user
  }

  const folderId = req.nextUrl.searchParams.get("folderId");
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  let query = admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_size, file_type, s3_key, deleted_at")
    .eq("status", "deleted")
    .gte("deleted_at", cutoff)
    .order("deleted_at", { ascending: false });

  query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);

  if (folderId) {
    const namespace = orgId ?? user.id;
    query = query.like("s3_key", `orgs/${namespace}/${folderId}/%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const files = (data ?? []).map((f) => ({
    id: f.id,
    name: f.file_name,
    size: f.file_size ?? 0,
    type: (f.file_type ?? "").toLowerCase(),
    deletedAt: f.deleted_at,
  }));

  return NextResponse.json({ files });
}
