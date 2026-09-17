import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "Shares — Slate360" };

export default function VnextOpsSharesPage() {
  return <VnextPageScaffold title="Shares" note={VNEXT_OWNER_NOTE} />;
}
