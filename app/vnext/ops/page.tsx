import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";
import { VnextOwnerRoutePage } from "@/lib/vnext/route-page";

export const metadata = { title: "Home — Slate360" };

export default function VnextOpsHomePage() {
  return <VnextOwnerRoutePage path="/vnext/ops" title="Home" note={VNEXT_OWNER_NOTE} />;
}
