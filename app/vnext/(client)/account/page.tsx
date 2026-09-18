import { VNEXT_CLIENT_NOTE } from "@/lib/vnext/copy";
import { VnextClientRoutePage } from "@/lib/vnext/route-page";

export const metadata = {
  title: "Account — Slate360",
};

export default function VnextAccountPage() {
  return <VnextClientRoutePage path="/vnext/account" title="Account" note={VNEXT_CLIENT_NOTE} />;
}
