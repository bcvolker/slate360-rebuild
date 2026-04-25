import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, forbidden, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

type SubStatus = "active" | "trialing" | "past_due" | "canceled";

interface OrgSubRow {
  id: string;
  name: string;
  tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

function projectStatus(row: OrgSubRow): SubStatus {
  const raw = (row.subscription_status ?? "").toLowerCase();
  if (raw === "active" || raw === "trialing" || raw === "past_due" || raw === "canceled") {
    return raw;
  }
  const tier = (row.tier ?? "trial").toLowerCase();
  if (tier === "trial" || tier === "free") return "trialing";
  return "active";
}

function projectPeriodEnd(row: OrgSubRow): string {
  if (row.trial_ends_at) return row.trial_ends_at;
  const start = new Date(row.created_at);
  start.setMonth(start.getMonth() + 1);
  return start.toISOString();
}

export const GET = (req: NextRequest) =>
  withAuth(req, async () => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("id, name, tier, subscription_status, trial_ends_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<OrgSubRow[]>();

    if (error) {
      console.error("[/api/operations/subscriptions] supabase error:", error);
      return serverError("Failed to load subscriptions");
    }

    const subscriptions = (data ?? []).map((row) => ({
      org_id: row.id,
      org_name: row.name,
      tier: row.tier ?? "trial",
      status: projectStatus(row),
      current_period_end: projectPeriodEnd(row),
    }));

    return ok({ subscriptions });
  });
