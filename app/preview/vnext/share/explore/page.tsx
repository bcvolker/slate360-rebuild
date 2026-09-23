import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextPublicShell } from "@/components/vnext/share/VnextPublicShell";
import { resolvePreviewExploreData } from "@/lib/vnext/preview-explore-fixtures";

export default function PreviewPublicExplorePage() {
  const data = resolvePreviewExploreData("reality", null, "a");
  return (
    <VnextPublicShell
      token="preview"
      projectName="Harbor Street Residence"
      sections={["overview", "explore", "history"]}
      pathname="/preview/vnext/share/explore"
    >
      <VnextExploreShell
        data={{ ...data, overviewHref: "/preview/vnext/share/project" }}
        initialPresent={false}
        basePath="/preview/vnext/share/explore"
        item={null}
        canWrite={false}
        showViews={false}
        persistViews="local"
      />
    </VnextPublicShell>
  );
}
