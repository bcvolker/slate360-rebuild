import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import WalledGardenDashboard from "@/components/walled-garden-dashboard";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardUpcomingEvent, DashboardRecentContact } from "@/components/dashboard/command-center/CommandCenterContent";

export const metadata = {
  title: "Command Center — Slate360",
};

export default async function DashboardPage() {
  const {
    user,
    orgId,
    orgName,
  } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  if (!orgId) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[dashboard] org bootstrap fallback failed", error);
    }
  }

  const [entitlements, upcomingEvents, recentContacts] = await Promise.all([
    resolveOrgEntitlements(orgId ?? null),
    orgId ? fetchUpcomingEvents(orgId) : Promise.resolve<DashboardUpcomingEvent[]>([]),
    orgId ? fetchRecentContacts(orgId) : Promise.resolve<DashboardRecentContact[]>([]),
  ]);

  return (
    <WalledGardenDashboard
      userName={user.user_metadata?.name ?? user.email ?? ""}
      orgName={orgName ?? ""}
      storageLimitGb={entitlements.maxStorageGB}
      entitlements={entitlements}
      upcomingEvents={upcomingEvents}
      recentContacts={recentContacts}
    />
  );
}

async function fetchUpcomingEvents(orgId: string): Promise<DashboardUpcomingEvent[]> {
  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await admin
      .from("calendar_events")
      .select("id, title, date, start_time, color")
      .eq("org_id", orgId)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(3);
    return (data ?? []) as DashboardUpcomingEvent[];
  } catch {
    return [];
  }
}

async function fetchRecentContacts(orgId: string): Promise<DashboardRecentContact[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("org_contacts")
      .select("id, name, company, title, initials, color")
      .eq("org_id", orgId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(3);
    return (data ?? []) as DashboardRecentContact[];
  } catch {
    return [];
  }
}
