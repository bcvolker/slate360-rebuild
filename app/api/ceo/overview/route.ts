import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, forbidden, serverError } from "@/lib/server/api-response";

/**
 * CEO Overview - platform-wide metrics
 * GET — returns org count, user count, revenue summary, recent activity
 */

function isCeo(email: string | undefined): boolean {
  return email === "slate360ceo@gmail.com";
}

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isCeo(user.email)) return forbidden("CEO access required");

    // Parallel queries for platform metrics
    const [orgsResult, profilesResult, staffResult] = await Promise.all([
      admin.from("organizations").select("id, tier, name", { count: "exact", head: false }),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("slate360_staff").select("id, email, display_name, access_scope, revoked_at"),
    ]);

    const orgs = orgsResult.data ?? [];
    const totalUsers = profilesResult.count ?? 0;
    const activeStaff = (staffResult.data ?? []).filter((s) => !s.revoked_at);

    // Tier breakdown
    const tierBreakdown: Record<string, number> = {};
    for (const org of orgs) {
      const t = org.tier ?? "trial";
      tierBreakdown[t] = (tierBreakdown[t] ?? 0) + 1;
    }

    return ok({
      totalOrgs: orgs.length,
      totalUsers,
      tierBreakdown,
      activeStaff: activeStaff.length,
      staff: staffResult.data ?? [],
    });
  });
