import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextExploreViewerStage } from "@/components/vnext/explore/VnextExploreViewerStage";
import { VnextReleaseActions } from "@/components/vnext/owner/VnextReleaseActions";
import { PREVIEW_EXPLORE_REALITY } from "@/lib/vnext/preview-explore-fixtures";

export default function PreviewQaRealityPage() {
  const data = PREVIEW_EXPLORE_REALITY.activeSourceData;
  return (
    <VnextOwnerShell pathname="/vnext/ops/qa">
      <div className="w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold text-[var(--vnext-ink)]">Harbor Street</h1>
        <p className="mt-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">Reality · Sep 22, 2026 · Needs review</p>
        <div className="mt-4 h-[70dvh] min-h-96 w-full">
          {data ? <VnextExploreViewerStage representation="reality" data={data} /> : null}
        </div>
        <VnextReleaseActions projectId="harbor" projectName="Harbor Street" representation="reality" representationLabel="Reality" sourceId="model-b" version="Sep 22, 2026" bucket="needs_review" />
        <a className="mt-3 inline-flex h-11 min-w-11 items-center text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" href="/preview/vnext/owner/client-preview-candidate">Preview as client</a>
      </div>
    </VnextOwnerShell>
  );
}
