import { VnextOpsProjectDetailPage } from "@/lib/vnext/owner/owner-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Project — Slate360" };

export default async function VnextOpsProjectRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await requireVnextOwner(`/vnext/ops/projects/${projectId}`);
  return VnextOpsProjectDetailPage({ projectId });
}
