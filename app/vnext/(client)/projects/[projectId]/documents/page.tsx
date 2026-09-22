import { notFound } from "next/navigation";
import { VnextDocumentsBrowser } from "@/components/vnext/documents/VnextDocumentsBrowser";
import { loadVnextProjectDocuments } from "@/lib/vnext/documents/load-project-documents";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export const metadata = {
  title: "Documents — Slate360",
};

export default async function VnextProjectDocumentsPage({ params }: PageProps) {
  const { projectId } = await params;
  const path = `/vnext/projects/${projectId}/documents`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const result = await loadVnextProjectDocuments(ctx.user.id, projectId);
  if (result.access === "denied") notFound();

  return (
    <VnextDocumentsBrowser
      documents={result.documents}
      hits={result.hits}
      folders={result.folders}
      documentsBase={path}
      error={result.error}
    />
  );
}
