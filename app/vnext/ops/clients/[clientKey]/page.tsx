import { VnextOpsClientDetailPage } from "@/lib/vnext/owner/owner-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Client — Slate360" };

export default async function VnextOpsClientRoute({ params }: { params: Promise<{ clientKey: string }> }) {
  const { clientKey } = await params;
  await requireVnextOwner(`/vnext/ops/clients/${clientKey}`);
  return VnextOpsClientDetailPage({ clientKey });
}
