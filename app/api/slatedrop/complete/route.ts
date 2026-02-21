/**
 * POST /api/slatedrop/complete
 * Called after client finishes uploading to S3.
 * Marks the file record as active.
 *
 * Body: { fileId, s3Key } — fileId may be null if insert failed at upload-url
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await req.json() as { fileId: string | null };
  if (!fileId) return NextResponse.json({ ok: true }); // already handled

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
    .update({ is_pending: false, modified_at: new Date().toISOString() })
    .eq("id", fileId);

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);
  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
