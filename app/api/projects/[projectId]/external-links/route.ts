import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    targetType?: "RFI" | "Submittal";
    targetId?: string;
    expiresInDays?: number;
  };

  const targetType = body.targetType;
  const targetId = String(body.targetId ?? "").trim();
  const expiresInDays = Number(body.expiresInDays ?? 14);

  if ((targetType !== "RFI" && targetType !== "Submittal") || !targetId) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000).toISOString();
  const token = randomUUID().replace(/-/g, "");

  const { error } = await admin.from("project_external_links").insert({
    project_id: projectId,
    target_type: targetType,
    target_id: targetId,
    token,
    expires_at: expiresAt,
    is_active: true,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = req.nextUrl.origin;
  return NextResponse.json({
    ok: true,
    token,
    url: `${origin}/external/respond/${token}`,
    expiresAt,
  });
}
