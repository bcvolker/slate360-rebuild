import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, forbidden, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { BETA_TESTER_CAP } from "@/lib/beta-mode";

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user }) => {
    const admin = createAdminClient();

    const { count, error: countErr } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("beta_tester", true);

    if (countErr) {
      return serverError("Failed to check beta tester cap");
    }

    if (count !== null && count >= BETA_TESTER_CAP) {
      return forbidden("beta_full");
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("profiles")
      .update({
        beta_tester: true,
        foundational_member: true,
        beta_joined_at: now,
        foundational_granted_at: now,
      })
      .eq("id", user.id);

    if (updateErr) {
      return serverError("Failed to update profile for beta access");
    }

    return ok({ beta: true, foundational: true });
  });
}
