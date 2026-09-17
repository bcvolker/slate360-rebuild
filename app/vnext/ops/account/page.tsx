import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "Account — Slate360" };

export default function VnextOpsAccountPage() {
  return <VnextPageScaffold title="Account" note={VNEXT_OWNER_NOTE} />;
}
