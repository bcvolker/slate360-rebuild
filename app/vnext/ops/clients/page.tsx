import { VnextOpsClientsPage } from "@/lib/vnext/owner/owner-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Clients — Slate360" };

export default async function VnextOpsClientsRoute() {
  await requireVnextOwner("/vnext/ops/clients");
  return VnextOpsClientsPage();
}
