import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const runtime = "nodejs";

export const POST = (req: NextRequest) =>
  withAuth(req, async () => {
    const ctx = await resolveServerOrgContext();
    if (!ctx.orgId || !ctx.user) return forbidden("Not authenticated");
    if (!ctx.isAdmin) return forbidden("Only admins can invite members");

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) return badRequest("Valid email required");

    const admin = createAdminClient();

    // 1. Check seat limit
    const ent = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });
    const { count, error: countErr } = await admin
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", ctx.orgId);

    if (countErr) return badRequest("Could not check seat count");

    const currentSeats = count ?? 0;
    if (currentSeats >= ent.maxSeats) {
      return forbidden(
        `Seat limit reached (${currentSeats}/${ent.maxSeats}). Upgrade your plan at /plans to add more members.`,
      );
    }

    // 2. Check if user already exists in Supabase auth
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const targetUser = existingUsers?.users?.find((u) => u.email === email);

    if (!targetUser) {
      return badRequest(
        "This email has not signed up for Slate360 yet. Ask them to create an account first, then try again.",
      );
    }

    // 3. Check if already a member
    const { data: existing } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", ctx.orgId)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existing) return badRequest("This user is already a member of your organization");

    // 4. Add the member
    const { error: insertErr } = await admin.from("organization_members").insert({
      org_id: ctx.orgId,
      user_id: targetUser.id,
      role: "member",
    });

    if (insertErr) return badRequest(`Failed to add member: ${insertErr.message}`);

    return ok({
      added: true,
      email,
      currentSeats: currentSeats + 1,
      maxSeats: ent.maxSeats,
    });
  });
