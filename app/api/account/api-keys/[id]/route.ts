import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MemberRow = {
  org_id: string;
  role?: string | null;
};

async function getAuthedAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const memberRes = await supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1);

  const member = (memberRes.data?.[0] as MemberRow | undefined) ?? null;
  if (!member) {
    return { ok: false as const, status: 400, error: "Organization membership not found" };
  }

  const role = member.role ?? "member";
  if (role !== "owner" && role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access required" };
  }

  return { ok: true as const, supabase, user, member };
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedAdminContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { id } = await params;

    const revokeRes = await ctx.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("org_id", ctx.member.org_id)
      .eq("id", id);

    if (revokeRes.error) {
      const deleteRes = await ctx.supabase
        .from("api_keys")
        .delete()
        .eq("org_id", ctx.member.org_id)
        .eq("id", id);

      if (deleteRes.error) {
        return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
      }
    }

    try {
      await ctx.supabase
        .from("audit_log")
        .insert({
          org_id: ctx.member.org_id,
          action: `API key revoked (${id.slice(0, 8)})`,
          actor: ctx.user.email ?? "admin",
        });
    } catch {
      // optional audit table
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/account/api-keys/:id][DELETE]", error);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
