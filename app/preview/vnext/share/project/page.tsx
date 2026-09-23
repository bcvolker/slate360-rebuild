import { VnextPublicOverview } from "@/components/vnext/share/VnextPublicOverview";
import { VnextPublicShell } from "@/components/vnext/share/VnextPublicShell";

export default function PreviewPublicProjectPage() {
  return (
    <VnextPublicShell
      token="preview"
      projectName="Harbor Street Residence"
      sections={["overview", "explore", "history"]}
      pathname="/preview/vnext/share/project"
    >
      <VnextPublicOverview
        projectName="Harbor Street Residence"
        exploreHref="/preview/vnext/share/explore"
        historyHref="/preview/vnext/share/history"
        sections={["overview", "explore", "history"]}
      />
    </VnextPublicShell>
  );
}
