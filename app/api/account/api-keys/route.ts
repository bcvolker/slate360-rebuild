import { randomBytes, createHash } from "crypto";
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
  const isAdmin = role === "owner" || role === "admin";
  if (!isAdmin) {
    return { ok: false as const, status: 403, error: "Admin access required" };
  }

  return { ok: true as const, supabase, user, member };
}

export async function GET() {
  try {
    const ctx = await getAuthedAdminContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const keysRes = await ctx.supabase
      .from("api_keys")
      .select("id,label,last_four,created_at")
      .eq("org_id", ctx.member.org_id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (keysRes.error) {
      return NextResponse.json({ apiKeys: [] });
    }

    const apiKeys = ((keysRes.data as Array<{ id: string; label?: string | null; last_four?: string | null; created_at?: string | null }> | null) ?? []).map((row, idx) => ({
      id: row.id,
      label: row.label || `API Key ${idx + 1}`,
      lastFour: row.last_four || "••••",
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error("[api/account/api-keys][GET]", error);
    return NextResponse.json({ error: "Failed to load API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthedAdminContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await req.json().catch(() => ({}));
    const rawLabel = typeof body.label === "string" ? body.label.trim() : "";
    const label = rawLabel || "Untitled Key";

    const secret = randomBytes(24).toString("hex");
    const publicKey = `slate_live_${secret}`;
    const keyHash = createHash("sha256").update(publicKey).digest("hex");
    const lastFour = publicKey.slice(-4);
    const keyPrefix = publicKey.slice(0, 14);

    let insertError: Error | null = null;
    let insertedId: string | null = null;
    const primaryInsert = await ctx.supabase
      .from("api_keys")
      .insert({
        org_id: ctx.member.org_id,
        label,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        last_four: lastFour,
        created_by: ctx.user.id,
      })
      .select("id,created_at")
      .single();

    if (primaryInsert.error) {
      const fallbackInsert = await ctx.supabase
        .from("api_keys")
        .insert({
          org_id: ctx.member.org_id,
          label,
          key_hash: keyHash,
          last_four: lastFour,
        })
        .select("id,created_at")
        .single();

      if (fallbackInsert.error) {
        insertError = fallbackInsert.error;
      } else {
        insertedId = (fallbackInsert.data as { id?: string } | null)?.id ?? null;
      }
    } else {
      insertedId = (primaryInsert.data as { id?: string } | null)?.id ?? null;
    }

    if (insertError) {
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    try {
      await ctx.supabase
        .from("audit_log")
        .insert({
          org_id: ctx.member.org_id,
          action: `API key created: ${label}`,
          actor: ctx.user.email ?? "admin",
        });
    } catch {
      // optional audit table
    }

    return NextResponse.json({
      key: {
        id: insertedId ?? keyHash.slice(0, 16),
        label,
        lastFour,
        raw: publicKey,
      },
    });
  } catch (error) {
    console.error("[api/account/api-keys][POST]", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
