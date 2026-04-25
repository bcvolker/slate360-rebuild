import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, forbidden, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  withAuth(req, async () => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const admin = createAdminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalUsersRes,
      onboardedRes,
      pendingBetaRes,
      totalOrgsRes,
      newUsersRes,
      newOrgsRes,
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("onboarding_completed_at", "is", null),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("beta_tester", false),
      admin.from("organizations").select("id", { count: "exact", head: true }),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      admin
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
    ]);

    const firstError =
      totalUsersRes.error ||
      onboardedRes.error ||
      pendingBetaRes.error ||
      totalOrgsRes.error ||
      newUsersRes.error ||
      newOrgsRes.error;
    if (firstError) {
      console.error("[/api/operations/overview] supabase error:", firstError);
      return serverError("Failed to load overview metrics");
    }

    return ok({
      metrics: {
        totalUsers: totalUsersRes.count ?? 0,
        onboardedUsers: onboardedRes.count ?? 0,
        pendingBeta: pendingBetaRes.count ?? 0,
        totalOrgs: totalOrgsRes.count ?? 0,
        newUsers7d: newUsersRes.count ?? 0,
        newOrgs7d: newOrgsRes.count ?? 0,
      },
    });
  });
