/**
 * Manage SlateDrop file share links.
 *
 * GET    /api/slatedrop/links?fileId=<slatedrop_uploads id>
 *        Lists the current user's active share links for a file.
 * DELETE /api/slatedrop/links   body: { token }
 *        Revokes (deletes) a share link the current user created.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fileId = req.nextUrl.searchParams.get("fileId")?.trim();
  if (!fileId) return NextResponse.json({ error: "fileId is required" }, { status: 400 });

  const admin = createAdminClient();

  // Links reference unified_files; map the upload to its unified file id.
  const { data: upload } = await admin
    .from("slatedrop_uploads")
    .select("unified_file_id")
    .eq("id", fileId)
    .maybeSingle();

  const unifiedFileId = (upload as { unified_file_id?: string | null } | null)?.unified_file_id ?? null;
  if (!unifiedFileId) return NextResponse.json({ ok: true, links: [] });

  const { data, error } = await admin
    .from("slate_drop_links")
    .select("id, token, role, expires_at, created_at")
    .eq("file_id", unifiedFileId)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const links = (data ?? [])
    .filter((link) => !link.expires_at || new Date(link.expires_at).getTime() > now)
    .map((link) => ({
      id: link.id,
      token: link.token,
      role: link.role,
      expiresAt: link.expires_at,
      createdAt: link.created_at,
    }));

  return NextResponse.json({ ok: true, links });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const admin = createAdminClient();

  const { error } = await admin
    .from("slate_drop_links")
    .delete()
    .eq("token", token)
    .eq("created_by", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
