import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextExploreViewerStage } from "@/components/vnext/explore/VnextExploreViewerStage";
import { VnextReleaseActions } from "@/components/vnext/owner/VnextReleaseActions";
import { PREVIEW_EXPLORE_360 } from "@/lib/vnext/preview-explore-fixtures";

export default function PreviewQaPanoPage() {
  const data = PREVIEW_EXPLORE_360.activeSourceData;
  return (
    <VnextOwnerShell pathname="/vnext/ops/qa">
      <div className="w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold text-[var(--vnext-ink)]">Library</h1>
        <p className="mt-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">360 · East stair · Needs review</p>
        <div className="mt-4 h-[70dvh] min-h-96 w-full">{data ? <VnextExploreViewerStage representation="360" data={data} /> : null}</div>
        <VnextReleaseActions projectId="library" projectName="Library" representation="pano360" representationLabel="360" sourceId="pano-1" version="East stair" bucket="needs_review" />
        <a className="mt-3 inline-flex h-11 min-w-11 items-center text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" href="/preview/vnext/owner/client-preview">Preview as client</a>
      </div>
    </VnextOwnerShell>
  );
}
