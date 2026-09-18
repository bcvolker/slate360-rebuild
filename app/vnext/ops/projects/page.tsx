import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "Projects — Slate360" };

export default function VnextOpsProjectsPage() {
  return <VnextOwnerRoutePage path="/vnext/ops/projects" title="Projects" note={VNEXT_OWNER_NOTE} />;
}
