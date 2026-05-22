import { Suspense } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { SiteWalkHomeClient } from "@/components/site-walk/SiteWalkHomeClient";
import { createAdminClient } from "@/lib/supabase/admin";
import type { V1DeliverableRow } from "@/components/site-walk/v1/views/DeliverablesView";

export default async function SiteWalkPage() {
  const context = await resolveServerOrgContext();
  const { projects, walks, summary } = await loadSiteWalkHubData(context.orgId);
  const deliverables = context.orgId ? await loadRecentDeliverables(context.orgId) : [];

  const userInitial =
    context.user?.user_metadata?.full_name?.[0]?.toUpperCase() ??
    context.user?.email?.[0]?.toUpperCase() ??
    "S";

  return (
    <Suspense fallback={null}>
      <SiteWalkHomeClient
        orgName={context.orgName}
        userInitial={userInitial}
        projects={projects}
        walks={walks}
        summary={summary}
        deliverables={deliverables}
      />
    </Suspense>
  );
}

async function loadRecentDeliverables(orgId: string): Promise<V1DeliverableRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_deliverables")
    .select("id, title, deliverable_type, status, created_at, share_token")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? []) as V1DeliverableRow[];
}
