import { notFound } from "next/navigation";
import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerProjectDetail } from "@/components/vnext/owner/VnextOwnerProjectDetail";
import { previewProjectDetail } from "@/lib/vnext/owner/preview-owner";

export default async function PreviewOwnerProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ included?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const detail = previewProjectDetail(projectId, query.included ?? null);
  if (!detail) notFound();
  return (
    <VnextOwnerShell pathname="/vnext/ops/projects">
      <VnextOwnerProjectDetail project={detail.project} included={detail.included} canWrite persist="local" error={null} />
    </VnextOwnerShell>
  );
}
