import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, forbidden, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

interface OrgRow {
  id: string;
  name: string;
  slug: string | null;
  tier: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  seats_purchased: number | null;
  seats_used: number | null;
  created_at: string;
  organization_members: Array<{ count: number }> | null;
}

export const GET = (req: NextRequest) =>
  withAuth(req, async () => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select(
        "id, name, slug, tier, plan_type, subscription_status, seats_purchased, seats_used, created_at, organization_members(count)",
      )
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<OrgRow[]>();

    if (error) {
      console.error("[/api/operations/organizations] supabase error:", error);
      return serverError("Failed to load organizations");
    }

    const organizations = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      tier: row.tier,
      plan_type: row.plan_type,
      subscription_status: row.subscription_status,
      seats_purchased: row.seats_purchased,
      seats_used: row.seats_used,
      created_at: row.created_at,
      member_count: row.organization_members?.[0]?.count ?? 0,
    }));

    return ok({ organizations });
  });
