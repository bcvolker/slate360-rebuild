import type { HubWalk } from "@/lib/types/site-walk";
import { DashboardDomainWorkspace, type WorkspaceItem } from "./DashboardDomainWorkspace";

export function DashboardSiteWalksContent({ walks }: { walks: HubWalk[] }) {
  const items: WorkspaceItem[] = walks.map((w) => ({
    id: w.id,
    title: w.title,
    status: w.status,
    projectName: w.projectName,
    updatedAt: w.updatedAt,
    href: `/site-walk/walks/${w.id}`,
  }));

  return (
    <DashboardDomainWorkspace
      title="Site Walks"
      subtitle={`${walks.length.toLocaleString()} walk sessions in this workspace`}
      primaryAction={{ label: "Open Site Walk", href: "/site-walk" }}
      items={items}
      activeStatuses={["in_progress", "draft", "active", "syncing"]}
      emptyTitle="No site walks yet"
      emptyDescription="Walk sessions appear here after field capture. Open Site Walk on a mobile device to start."
    />
  );
}
