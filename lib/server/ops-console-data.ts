import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getOperationsConsoleCounts } from "@/lib/server/operations-console-counts";
import type {
  OpsConsoleInitialData,
  OpsFeedbackItem,
  OpsHealth,
  OpsOverview,
  OpsPendingUser,
  OpsStaffGrant,
} from "@/lib/ops-console/types";

type FeedbackRow = {
  id: string;
  type: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
  severity: string | null;
  created_at: string;
};

type PendingRow = { id: string; email: string | null; created_at: string };

type StaffRow = {
  id: string;
  email: string;
  display_name: string | null;
  access_scope: string[] | null;
  granted_at: string;
  revoked_at: string | null;
};

type OrgRow = { tier: string | null };

function readHealth(): OpsHealth {
  return {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL),
  };
}

/**
 * Loads everything the Operations Console needs for first paint, scoped by role.
 * Staff (non-CEO) get only the feedback + pending-approval queues; CEO also gets
 * platform overview metrics, the staff roster, and integration health.
 */
export async function loadOpsConsoleData(isCeo: boolean): Promise<OpsConsoleInitialData> {
  const admin = createAdminClient();
  const counts = await getOperationsConsoleCounts();

  const [feedbackRes, pendingRes] = await Promise.all([
    admin
      .from("beta_feedback")
      .select("id,type,status,title,description,severity,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("profiles")
      .select("id,email,created_at")
      .eq("account_status", "pending_approval")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const feedback: OpsFeedbackItem[] = ((feedbackRes.data as FeedbackRow[] | null) ?? []).map((r) => ({
    id: r.id,
    type: r.type ?? "other",
    status: r.status ?? "new",
    title: r.title ?? "(untitled)",
    description: r.description ?? "",
    severity: r.severity,
    createdAt: r.created_at,
  }));

  const pendingUsers: OpsPendingUser[] = ((pendingRes.data as PendingRow[] | null) ?? []).map((r) => ({
    id: r.id,
    email: r.email ?? "(no email)",
    createdAt: r.created_at,
  }));

  if (!isCeo) {
    return { isCeo, counts, overview: null, feedback, pendingUsers, staff: [], health: null };
  }

  const [orgsRes, usersCountRes, staffRes] = await Promise.all([
    admin.from("organizations").select("tier"),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("slate360_staff")
      .select("id,email,display_name,access_scope,granted_at,revoked_at")
      .order("granted_at", { ascending: false }),
  ]);

  const orgs = (orgsRes.data as OrgRow[] | null) ?? [];
  const tierBreakdown: Record<string, number> = {};
  for (const org of orgs) {
    const tier = org.tier ?? "trial";
    tierBreakdown[tier] = (tierBreakdown[tier] ?? 0) + 1;
  }

  const overview: OpsOverview = {
    totalOrgs: orgs.length,
    totalUsers: usersCountRes.count ?? 0,
    tierBreakdown,
  };

  const staff: OpsStaffGrant[] = ((staffRes.data as StaffRow[] | null) ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    accessScope: r.access_scope ?? [],
    grantedAt: r.granted_at,
    revokedAt: r.revoked_at,
  }));

  return { isCeo, counts, overview, feedback, pendingUsers, staff, health: readHealth() };
}
