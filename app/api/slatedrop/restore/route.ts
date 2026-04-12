/**
 * POST /api/slatedrop/restore
 * Restores a soft-deleted file within the 30-day recovery window.
 * Body: { fileId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { fileId } = await req.json() as { fileId: string };
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
    // solo user
  }

  const { data: file, error: fetchErr } = await admin
    .from("slatedrop_uploads")
    .select("id, file_size, status, deleted_at, uploaded_by, org_id")
    .eq("id", fileId)
    .single();

  if (fetchErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.status !== "deleted") {
    return NextResponse.json({ error: "File is not deleted" }, { status: 400 });
  }

  const authorized = orgId ? file.org_id === orgId : file.uploaded_by === user.id;
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check recovery window
  if (file.deleted_at) {
    const deletedTime = new Date(file.deleted_at).getTime();
    if (Date.now() - deletedTime > THIRTY_DAYS_MS) {
      return NextResponse.json({ error: "Recovery window expired (30 days)" }, { status: 410 });
    }
  }

  const { error: updateError } = await admin
    .from("slatedrop_uploads")
    .update({ status: "active", deleted_at: null })
    .eq("id", fileId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Re-add storage usage
  if (orgId) {
    await trackStorageUsed(admin, orgId, fileId);
  }

  return NextResponse.json({ ok: true });
}
