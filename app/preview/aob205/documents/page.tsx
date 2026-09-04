import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { DocumentsList } from "@/components/client-experience/ProjectLists";

export default function Page() {
  return (<><ProjectShell data={data} section="documents" backHref={data.basePath} /><DocumentsList data={data} /></>);
}
