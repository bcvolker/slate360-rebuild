import { renderOwnerSharesPage } from "@/lib/vnext/share/owner-share-page";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Shares — Slate360" };

export default async function VnextOpsSharesPage() {
  await requireVnextOwner("/vnext/ops/shares");
  return renderOwnerSharesPage();
}
