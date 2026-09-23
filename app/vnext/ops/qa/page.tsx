import { renderQaPage } from "@/lib/vnext/ops/ops-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "QA — Slate360" };

export default async function VnextOpsQaPage() {
  await requireVnextOwner("/vnext/ops/qa");
  return renderQaPage();
}
