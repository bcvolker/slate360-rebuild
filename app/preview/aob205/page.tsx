import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { ProjectOverview } from "@/components/client-experience/ProjectOverview";

export default function Aob205OverviewPage() {
  return (<><ProjectShell data={data} section="overview" /><ProjectOverview data={data} /></>);
}
