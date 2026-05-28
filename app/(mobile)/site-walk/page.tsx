import { Suspense } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { SiteWalkHomeClient } from "@/components/site-walk/SiteWalkHomeClient";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";

export const metadata = {
  title: "Site Walk — Slate360",
  description: "Field capture, plan walks, and deliverables for construction teams.",
};

export default async function SiteWalkHomePage() {
  const context = await resolveServerOrgContext();
  const { projects, walks, summary } = await loadSiteWalkHubData(context.orgId);
  const deliverables = context.orgId ? await loadRecentDeliverables(context.orgId) : [];

  return (
    <Suspense fallback={null}>
      <SiteWalkHomeClient
        orgName={context.orgName}
        projects={projects}
        walks={walks}
        summary={summary}
        deliverables={deliverables}
      />
    </Suspense>
  );
}

async function loadRecentDeliverables(orgId: string): Promise<HubDeliverableRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_deliverables")
    .select("id, title, deliverable_type, status, created_at, share_token")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? []) as HubDeliverableRow[];
}
