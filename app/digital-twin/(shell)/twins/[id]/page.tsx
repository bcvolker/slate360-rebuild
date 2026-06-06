import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadTwinSpaceViewerData } from "@/lib/digital-twin/load-space-viewer";
import { TwinViewerWorkspace } from "@/components/digital-twin/TwinViewerWorkspace";
import { TwinGpsDisplay } from "@/components/digital-twin/TwinGpsDisplay";
import { DesktopWorkspaceLinks } from "@/components/digital-twin/desktop/DesktopWorkspaceLinks";
import { TwinShareActions } from "@/components/digital-twin/TwinShareActions";
import { TwinViewerDisclaimer } from "@/components/digital-twin/TwinViewerDisclaimer";
import { MobileEmptyState } from "@/components/mobile-system";
import { Boxes } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export default async function DigitalTwinViewerPage({ params }: Props) {
  const { id } = await params;
  const context = await resolveServerOrgContext();
  const viewer = await loadTwinSpaceViewerData(id, context.orgId);

  if (!viewer) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <MobileEmptyState
          icon={Boxes}
          title="Twin not found"
          description="This twin may have been removed or you may not have access."
          actionLabel="Back to twins"
          actionHref="/digital-twin/twins"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="mb-3 space-y-2">
        <div>
          <p className="truncate text-sm font-semibold text-zinc-100">{viewer.spaceTitle}</p>
          <p className="mt-0.5 text-xs capitalize text-zinc-400">{viewer.spaceStatus.replace(/_/g, " ")}</p>
        </div>
        <DesktopWorkspaceLinks spaceId={viewer.spaceId} />
      </div>

      <TwinGpsDisplay gps={viewer.latestGps} />
      <TwinViewerWorkspace viewer={viewer} />

      <div className="mt-4 space-y-3">
        <TwinShareActions spaceId={viewer.spaceId} />
        <TwinViewerDisclaimer />
      </div>
    </div>
  );
}
