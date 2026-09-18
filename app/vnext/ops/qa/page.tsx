import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "QA & Publish — Slate360" };

export default function VnextOpsQaPage() {
  return <VnextOwnerRoutePage path="/vnext/ops/qa" title="QA & Publish" note={VNEXT_OWNER_NOTE} />;
}
