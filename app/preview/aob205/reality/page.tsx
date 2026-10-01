import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { RealityIndex } from "@/components/client-experience/ProjectLists";

export default function Page() {
  return (<><ProjectShell data={data} section="reality" backHref={data.basePath} /><RealityIndex data={data} /></>);
}
