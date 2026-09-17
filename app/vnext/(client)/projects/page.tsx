import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_CLIENT_NOTE } from "@/lib/vnext/copy";

export const metadata = {
  title: "Projects — Slate360",
};

export default function VnextProjectsPage() {
  return <VnextPageScaffold title="Projects" note={VNEXT_CLIENT_NOTE} />;
}
