import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextClientPreviewFrame } from "@/components/vnext/owner/VnextClientPreviewFrame";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { PREVIEW_EXPLORE_REALITY } from "@/lib/vnext/preview-explore-fixtures";
import { PREVIEW_OVERVIEW_NAV_PATH, PREVIEW_OVERVIEW_PROJECT, PREVIEW_PROJECT_NAV_ITEMS } from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewCandidatePage() {
  const current = PREVIEW_EXPLORE_REALITY.activeSourceData;
  const data = {
    ...PREVIEW_EXPLORE_REALITY,
    availableRepresentations: PREVIEW_EXPLORE_REALITY.availableRepresentations.filter((rep) => rep !== "thermal"),
    activeSourceId: "model-b",
    activeSourceData: current && current.kind === "reality" ? { ...current, modelId: "model-b", modelTitle: "Harbor Street — candidate model B" } : current,
  };
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextClientPreviewFrame exitHref="/preview/vnext/owner/qa-reality" candidate="Reality model B">
        <VnextProjectNav projectId={PREVIEW_OVERVIEW_PROJECT.id} pathname={PREVIEW_PROJECT_NAV_ITEMS[1].href} items={PREVIEW_PROJECT_NAV_ITEMS.filter((item) => item.label !== "Thermal")} />
        <VnextExploreShell data={data} initialPresent={false} basePath="/preview/vnext/owner/client-preview-candidate" item={null} canWrite={false} views={[]} persistViews="local" />
      </VnextClientPreviewFrame>
    </VnextClientShell>
  );
}
