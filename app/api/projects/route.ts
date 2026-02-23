import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listScopedProjectsForUser } from "@/lib/projects/access";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projects, error } = await listScopedProjectsForUser(user.id);

  if (error) {
    console.error("[api/projects]", error.message);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }

  return NextResponse.json({ projects });
}
