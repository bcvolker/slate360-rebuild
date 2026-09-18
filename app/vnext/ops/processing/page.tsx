import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "Processing — Slate360" };

export default function VnextOpsProcessingPage() {
  return (
    <VnextOwnerRoutePage path="/vnext/ops/processing" title="Processing" note={VNEXT_OWNER_NOTE} />
  );
}
