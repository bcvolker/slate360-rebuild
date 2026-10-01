import { VnextOpsProjectsPage } from "@/lib/vnext/owner/owner-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Projects — Slate360" };

export default async function VnextOpsProjectsRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; client?: string; attention?: string }>;
}) {
  const query = await searchParams;
  await requireVnextOwner("/vnext/ops/projects");
  return VnextOpsProjectsPage(query);
}
