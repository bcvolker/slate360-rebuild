import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextPublicShell } from "@/components/vnext/share/VnextPublicShell";
import { PREVIEW_SAVED_VIEWS, applyPreviewSavedView } from "@/lib/vnext/views/preview-saved-views";

export default function PreviewPublicEvidencePage() {
  const view = PREVIEW_SAVED_VIEWS.find((entry) => entry.id === "sv-history");
  const applied = view ? applyPreviewSavedView(view, null) : null;
  if (!view || !applied || applied.unavailable) return null;
  return (
    <VnextPublicShell token="evidence" projectName="Harbor Street Residence" sections={[]} pathname="/preview/vnext/share/evidence">
      <VnextExploreShell
        data={{
          ...applied.data,
          availableRepresentations: ["reality"],
          sourcesByRepresentation: {},
          overviewHref: "/preview/vnext/share/evidence",
        }}
        initialPresent={false}
        basePath="/preview/vnext/share/evidence"
        item={null}
        canWrite={false}
        openedView={view}
        viewId={view.id}
        showViews={false}
        persistViews="local"
      />
    </VnextPublicShell>
  );
}
