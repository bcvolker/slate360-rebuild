import type { HubTwin } from "@/lib/types/digital-twin-hub";
import { DashboardDomainWorkspace, type WorkspaceItem } from "./DashboardDomainWorkspace";

/**
 * F1 Produce-board index — near-identical to DashboardTwinsContent, but links
 * into the Studio shell (/twin-studio/[id]) instead of the app's own twin
 * detail view (/digital-twin/twins/[id]). Two separate destinations for two
 * separate audiences: that one is the client-facing app, this is the
 * operator's production cockpit.
 */
export function TwinStudioIndexContent({ twins }: { twins: HubTwin[] }) {
  const items: WorkspaceItem[] = twins.map((tw) => ({
    id: tw.id,
    title: tw.title,
    status: tw.statusChip ?? tw.status,
    projectName: tw.projectName,
    updatedAt: tw.updatedAt,
    href: `/twin-studio/${tw.id}`,
  }));

  return (
    <DashboardDomainWorkspace
      title="Twin Studio"
      subtitle={`${twins.length.toLocaleString()} spaces in production`}
      primaryAction={{ label: "Open Twin 360", href: "/digital-twin" }}
      items={items}
      activeStatuses={["processing", "queued", "uploading", "draft", "capturing"]}
      emptyTitle="No twins yet"
      emptyDescription="Twin spaces appear here after a capture is uploaded. Use the Twin 360 app to create the first one."
    />
  );
}
