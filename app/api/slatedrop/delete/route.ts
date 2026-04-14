/**
 * DELETE /api/slatedrop/delete
 * Soft-deletes a file: marks status='deleted' + sets deleted_at timestamp.
 * S3 object is RETAINED for 30-day recovery window.
 * Permanent purge happens via scheduled cleanup (future).
 *
 * Body: { fileId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recoverOrgStorage } from "@/lib/s3-utils";

export async function DELETE(req: NextRequest) {
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
    // solo user fallback
  }

  // Fetch file to verify ownership
  const { data: file, error: fetchErr } = await admin
    .from("slatedrop_uploads")
    .select("id, file_size, s3_key, uploaded_by, org_id, status")
    .eq("id", fileId)
    .single();

  if (fetchErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.status === "deleted") {
    return NextResponse.json({ error: "File already deleted" }, { status: 400 });
  }

  const authorized = orgId ? file.org_id === orgId : file.uploaded_by === user.id;
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Phase 1 bridge safety ──────────────────────────────────────
  // If a Site Walk item references this file via file_id, block
  // deletion to prevent a dangling reference. The user must remove
  // the Site Walk item first (or we unlink in a future flow).
  const { count: linkedItems } = await admin
    .from("site_walk_items")
    .select("id", { count: "exact", head: true })
    .eq("file_id", fileId);

  if (linkedItems && linkedItems > 0) {
    return NextResponse.json(
      { error: "This file is attached to a Site Walk capture and cannot be deleted from SlateDrop." },
      { status: 409 },
    );
  }

  // Soft-delete only — S3 object retained for recovery window
  const { error: updateError } = await admin
    .from("slatedrop_uploads")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", fileId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Free quota immediately (file is no longer "active" from user's perspective)
  if (orgId && file.file_size) {
    await recoverOrgStorage(orgId, Number(file.file_size));
  }

  return NextResponse.json({ ok: true });
}
