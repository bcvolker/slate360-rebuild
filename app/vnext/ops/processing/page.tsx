import { renderProcessingPage } from "@/lib/vnext/ops/ops-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Processing — Slate360" };

export default async function VnextOpsProcessingPage() {
  await requireVnextOwner("/vnext/ops/processing");
  return renderProcessingPage();
}
