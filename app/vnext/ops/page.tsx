import { VnextOpsHomePage } from "@/lib/vnext/owner/owner-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Home — Slate360" };

export default async function VnextOpsHomeRoute() {
  await requireVnextOwner("/vnext/ops");
  return VnextOpsHomePage();
}
