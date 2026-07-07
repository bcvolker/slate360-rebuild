import type { HubTwin } from "@/lib/types/digital-twin-hub";
import { DashboardDomainWorkspace, type WorkspaceItem } from "./DashboardDomainWorkspace";

export function DashboardTwinsContent({ twins }: { twins: HubTwin[] }) {
  const items: WorkspaceItem[] = twins.map((tw) => ({
    id: tw.id,
    title: tw.title,
    status: tw.statusChip ?? tw.status,
    projectName: tw.projectName,
    updatedAt: tw.updatedAt,
    href: `/digital-twin/twins/${tw.id}`,
  }));

  return (
    <DashboardDomainWorkspace
      title="Twin 360"
      subtitle={`${twins.length.toLocaleString()} twin spaces in this workspace`}
      primaryAction={{ label: "Open Twin 360", href: "/digital-twin" }}
      items={items}
      activeStatuses={["processing", "queued", "uploading", "draft", "capturing"]}
      emptyTitle="No twins yet"
      emptyDescription="Twin spaces appear here after capture and processing. Use the Twin 360 app to create your first space."
    />
  );
}
