import { VnextHistoryBrowser } from "@/components/vnext/history/VnextHistoryBrowser";
import { VnextPublicShell } from "@/components/vnext/share/VnextPublicShell";

export default function PreviewPublicHistoryPage() {
  return (
    <VnextPublicShell
      token="preview"
      projectName="Harbor Street Residence"
      sections={["overview", "explore", "history"]}
      pathname="/preview/vnext/share/history"
    >
      <VnextHistoryBrowser visits={[]} historyBase="/preview/vnext/share/history" allowCompare={false} />
    </VnextPublicShell>
  );
}
