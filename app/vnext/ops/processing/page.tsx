import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "Processing — Slate360" };

export default function VnextOpsProcessingPage() {
  return <VnextPageScaffold title="Processing" note={VNEXT_OWNER_NOTE} />;
}
