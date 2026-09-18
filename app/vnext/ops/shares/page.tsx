import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "Shares — Slate360" };

export default function VnextOpsSharesPage() {
  return <VnextOwnerRoutePage path="/vnext/ops/shares" title="Shares" note={VNEXT_OWNER_NOTE} />;
}
