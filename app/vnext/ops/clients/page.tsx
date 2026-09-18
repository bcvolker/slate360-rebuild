import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "Clients — Slate360" };

export default function VnextOpsClientsPage() {
  return <VnextOwnerRoutePage path="/vnext/ops/clients" title="Clients" note={VNEXT_OWNER_NOTE} />;
}
