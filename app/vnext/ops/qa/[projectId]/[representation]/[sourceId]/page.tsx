import { renderQaDetailPage } from "@/lib/vnext/ops/ops-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

type PageProps = { params: Promise<{ projectId: string; representation: string; sourceId: string }> };

export const metadata = { title: "Review — Slate360" };

export default async function VnextOpsQaDetailPage({ params }: PageProps) {
  const { projectId, representation, sourceId } = await params;
  await requireVnextOwner(`/vnext/ops/qa/${projectId}/${representation}/${sourceId}`);
  return renderQaDetailPage(projectId, representation, sourceId);
}
