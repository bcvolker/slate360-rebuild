import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "Account — Slate360" };

export default function VnextOpsAccountPage() {
  return <VnextOwnerRoutePage path="/vnext/ops/account" title="Account" note={VNEXT_OWNER_NOTE} />;
}
