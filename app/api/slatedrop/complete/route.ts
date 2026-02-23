/**
 * POST /api/slatedrop/complete
 * Called after client finishes uploading to S3.
 * Marks the slatedrop_uploads record as active.
 *
 * Body: { fileId } — fileId may be null if insert failed at upload-url
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    fileId,
    publicToken,
  } = (await req.json()) as { fileId: string | null; publicToken?: string };
  if (!fileId) return NextResponse.json({ ok: true }); // already handled

  if (publicToken) {
    const { data: linkRow } = await admin
      .from("project_external_links")
      .select("project_id, folder_id, created_by, expires_at")
      .eq("token", publicToken)
      .maybeSingle();

    if (!linkRow) return NextResponse.json({ error: "Invalid upload token" }, { status: 403 });
    if (linkRow.expires_at && new Date(linkRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Upload token expired" }, { status: 403 });
    }

    const { data: project } = await admin
      .from("projects")
      .select("org_id")
      .eq("id", linkRow.project_id)
      .single();

    const namespace = resolveNamespace(project?.org_id ?? null, linkRow.created_by);
    const prefix = `orgs/${namespace}/${linkRow.folder_id}/`;

    const { error } = await admin
      .from("slatedrop_uploads")
      .update({ status: "active" })
      .eq("id", fileId)
      .like("s3_key", `${prefix}%`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  let query = admin
    .from("slatedrop_uploads")
    .update({ status: "active" })
    .eq("id", fileId);

  query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);
  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
