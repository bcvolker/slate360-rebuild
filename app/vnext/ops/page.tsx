import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "Home — Slate360" };

export default function VnextOpsHomePage() {
  return <VnextPageScaffold title="Home" note={VNEXT_OWNER_NOTE} />;
}
