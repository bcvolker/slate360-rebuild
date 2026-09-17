import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "Clients — Slate360" };

export default function VnextOpsClientsPage() {
  return <VnextPageScaffold title="Clients" note={VNEXT_OWNER_NOTE} />;
}
