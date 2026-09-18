import { VNEXT_CLIENT_NOTE } from "@/lib/vnext/copy";
import { VnextClientRoutePage } from "@/lib/vnext/route-page";

export const metadata = {
  title: "Projects — Slate360",
};

export default function VnextProjectsPage() {
  return <VnextClientRoutePage path="/vnext/projects" title="Projects" note={VNEXT_CLIENT_NOTE} />;
}
