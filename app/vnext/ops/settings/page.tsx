import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export const metadata = { title: "Settings — Slate360" };

export default function VnextOpsSettingsPage() {
  return <VnextPageScaffold title="Settings" note={VNEXT_OWNER_NOTE} />;
}
