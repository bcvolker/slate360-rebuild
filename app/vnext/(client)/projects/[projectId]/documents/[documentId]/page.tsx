import { notFound } from "next/navigation";
import { VnextDocumentDetail } from "@/components/vnext/documents/VnextDocumentDetail";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { loadVnextDocumentDetail } from "@/lib/vnext/documents/load-project-documents";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string; documentId: string }>;
};

export const metadata = {
  title: "Document — Slate360",
};

export default async function VnextProjectDocumentPage({ params }: PageProps) {
  const { projectId, documentId } = await params;
  const path = `/vnext/projects/${projectId}/documents/${documentId}`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const result = await loadVnextDocumentDetail(ctx.user.id, projectId, documentId);
  if (result.access === "denied" || result.access === "missing") notFound();
  if (result.access === "error") return <VnextOverviewErrorNotice message={result.message} />;

  return <VnextDocumentDetail document={result.document} documentsHref={`/vnext/projects/${projectId}/documents`} />;
}
