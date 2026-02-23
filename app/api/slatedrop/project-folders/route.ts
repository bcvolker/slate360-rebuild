import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
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

  let query = admin
    .from("project_folders")
    .select("id, name, folder_path, project_id")
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);

  const { data, error } = await query;
  if (error) {
    console.error("[slatedrop/project-folders]", error.message);
    return NextResponse.json({ folders: [] });
  }

  return NextResponse.json({
    folders: (data ?? []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      path: folder.folder_path ?? folder.name,
      projectId: folder.project_id,
    })),
  });
}
