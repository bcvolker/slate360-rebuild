import type { HubTwin } from "@/lib/types/digital-twin-hub";
import { DashboardDomainWorkspace, type WorkspaceItem } from "./DashboardDomainWorkspace";

export function DashboardTwinsContent({ twins }: { twins: HubTwin[] }) {
  const items: WorkspaceItem[] = twins.map((tw) => ({
    id: tw.id,
    title: tw.title,
    status: tw.statusChip ?? tw.status,
    // LISTING-FIX: the model count is what the card is FOR — say it.
    detail: tw.readyModels > 0 ? `${tw.readyModels} model${tw.readyModels === 1 ? "" : "s"}` : "no models yet",
    projectName: tw.projectName,
    updatedAt: tw.updatedAt,
    // ROUTE-FIX: desktop opens the Studio cockpit, not the phone-first viewer.
    href: `/twin-studio/${tw.id}`,
  }));

  return (
    <DashboardDomainWorkspace
      title="Twin 360"
      subtitle={`${twins.length.toLocaleString()} twin spaces in this workspace`}
      primaryAction={{ label: "Open Twin 360", href: "/digital-twin" }}
      items={items}
      // LISTING-FIX: "Active" = a job is actually running. Idle drafts previously
      // landed here as fake "PROCESSING" and buried every real model.
      activeStatuses={["processing", "queued", "uploading", "capturing"]}
      emptyTitle="No twins yet"
      emptyDescription="Twin spaces appear here after capture and processing. Use the Twin 360 app to create your first space."
    />
  );
}
