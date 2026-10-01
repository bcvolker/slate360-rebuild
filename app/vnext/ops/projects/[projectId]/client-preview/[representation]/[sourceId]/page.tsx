import { renderClientPreviewPage } from "@/lib/vnext/ops/ops-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

type PageProps = { params: Promise<{ projectId: string; representation: string; sourceId: string }> };

export const metadata = { title: "Preview as client — Slate360" };

export default async function VnextCandidatePreviewPage({ params }: PageProps) {
  const { projectId, representation, sourceId } = await params;
  await requireVnextOwner(`/vnext/ops/projects/${projectId}/client-preview/${representation}/${sourceId}`);
  return renderClientPreviewPage(projectId, { representation, sourceId });
}
