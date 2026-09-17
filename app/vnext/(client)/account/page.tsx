import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_CLIENT_NOTE } from "@/lib/vnext/copy";

export const metadata = {
  title: "Account — Slate360",
};

export default function VnextAccountPage() {
  return <VnextPageScaffold title="Account" note={VNEXT_CLIENT_NOTE} />;
}
