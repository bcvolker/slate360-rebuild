import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { ItemsList } from "@/components/client-experience/ProjectLists";

export default function Page() {
  return (<><ProjectShell data={data} section="items" backHref={data.basePath} /><ItemsList data={data} /></>);
}
