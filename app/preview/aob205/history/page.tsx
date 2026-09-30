import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { HistoryList } from "@/components/client-experience/ProjectLists";

export default function Page() {
  return (<><ProjectShell data={data} section="history" backHref={data.basePath} /><HistoryList data={data} /></>);
}
