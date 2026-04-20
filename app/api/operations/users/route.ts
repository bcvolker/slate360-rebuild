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
    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, email, first_name, last_name, organization_name, role, beta_tester, onboarding_completed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[/api/operations/users] supabase error:", error);
      return serverError("Failed to load user accounts");
    }

    return ok({ users: data ?? [] });
  });
