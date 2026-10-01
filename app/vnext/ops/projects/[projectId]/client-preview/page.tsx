import { renderClientPreviewPage } from "@/lib/vnext/ops/ops-pages";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

type PageProps = { params: Promise<{ projectId: string }> };

export const metadata = { title: "Preview as client — Slate360" };

export default async function VnextClientPreviewPage({ params }: PageProps) {
  const { projectId } = await params;
  await requireVnextOwner(`/vnext/ops/projects/${projectId}/client-preview`);
  return renderClientPreviewPage(projectId, null);
}
