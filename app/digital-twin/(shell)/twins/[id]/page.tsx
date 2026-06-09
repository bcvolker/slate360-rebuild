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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 px-4 pt-3">
        <div>
          <p className="truncate text-sm font-semibold text-zinc-100">{viewer.spaceTitle}</p>
          <p className="mt-0.5 text-xs capitalize text-zinc-400">{viewer.spaceStatus.replace(/_/g, " ")}</p>
        </div>
        <DesktopWorkspaceLinks spaceId={viewer.spaceId} />
        <TwinGpsDisplay gps={viewer.latestGps} />
      </div>

      <div className="relative min-h-0 flex-1 px-2 pb-2 pt-1 sm:px-3">
        <TwinViewerWorkspace viewer={viewer} />
      </div>

      <div className="shrink-0 space-y-3 overflow-y-auto px-4 pb-4">
        <TwinShareActions spaceId={viewer.spaceId} />
        <TwinViewerDisclaimer />
      </div>
    </div>
  );
}
