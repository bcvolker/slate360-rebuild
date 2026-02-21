/**
 * PATCH /api/slatedrop/rename
 * Renames a file record in Supabase.
 * Body: { fileId, newName }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId, newName } = await req.json() as { fileId: string; newName: string };
  if (!fileId || !newName?.trim()) {
    return NextResponse.json({ error: "fileId and newName required" }, { status: 400 });
  }

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
    .update({ name: newName.trim(), modified_at: new Date().toISOString() })
    .eq("id", fileId);

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);
  const { error } = await query;

  if (error) {
    console.error("[slatedrop/rename]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
