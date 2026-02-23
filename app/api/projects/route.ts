import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    orgId = null;
  }

  let query = admin
    .from("projects")
    .select("id, name, description, metadata, status, created_by, created_at")
    .order("created_at", { ascending: false });

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);

  const { data, error } = await query;

  if (error) {
    console.error("[api/projects]", error.message);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}
