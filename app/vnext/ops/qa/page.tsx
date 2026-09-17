import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "QA & Publish — Slate360" };

export default function VnextOpsQaPage() {
  return <VnextPageScaffold title="QA & Publish" note={VNEXT_OWNER_NOTE} />;
}
