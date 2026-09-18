import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "Settings — Slate360" };

export default function VnextOpsSettingsPage() {
  return <VnextOwnerRoutePage path="/vnext/ops/settings" title="Settings" note={VNEXT_OWNER_NOTE} />;
}
