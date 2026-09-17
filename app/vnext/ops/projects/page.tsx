import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "Projects — Slate360" };

export default function VnextOpsProjectsPage() {
  return <VnextPageScaffold title="Projects" note={VNEXT_OWNER_NOTE} />;
}
