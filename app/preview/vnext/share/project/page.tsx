import { VnextPublicOverview } from "@/components/vnext/share/VnextPublicOverview";
import { VnextPublicShell } from "@/components/vnext/share/VnextPublicShell";
import { PREVIEW_PUBLIC_OVERVIEW } from "@/lib/vnext/share/preview-share-fixtures";

const overview = {
  ...PREVIEW_PUBLIC_OVERVIEW,
  hero: { kind: "reality" as const, url: "/vnext-preview/reality.svg" },
  exploreHref: "/preview/vnext/share/explore",
  historyHref: "/preview/vnext/share/history",
};

export default function PreviewPublicProjectPage() {
  return (
    <VnextPublicShell
      token="preview"
      projectName="Harbor Street Residence"
      sections={["overview", "explore", "history"]}
      pathname="/preview/vnext/share/project"
    >
      <VnextPublicOverview overview={overview} />
    </VnextPublicShell>
  );
}
