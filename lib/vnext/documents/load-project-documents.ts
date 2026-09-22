import "server-only";

import { getScopedProjectForUser } from "@/lib/projects/access";
import { vnextProjectHref } from "@/lib/vnext/nav";
import type { VnextClientDocument, VnextDocumentFolder, VnextSearchHit } from "./document-types";
import { readClientDocumentFile, readProjectDocuments } from "./read-project-documents";

export type DocumentsPageResult =
  | { access: "denied" }
  | { access: "ok"; documents: VnextClientDocument[]; hits: VnextSearchHit[]; folders: VnextDocumentFolder[]; error: string | null };

export async function loadVnextProjectDocuments(userId: string, projectId: string): Promise<DocumentsPageResult> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return { access: "denied" };
  const base = vnextProjectHref(projectId);
  const read = await readProjectDocuments(admin, projectId, {
    documentsBase: `${base}/documents`,
    itemsBase: `${base}/items`,
    exploreBase: `${base}/explore`,
  });
  const folders = folderChoices(read.documents);
  return { access: "ok", documents: read.documents, hits: read.hits, folders, error: read.error };
}

export type DocumentDetailResult =
  | { access: "denied" }
  | { access: "missing" }
  | { access: "error"; message: string }
  | { access: "ok"; document: VnextClientDocument };

export async function loadVnextDocumentDetail(
  userId: string,
  projectId: string,
  documentId: string,
): Promise<DocumentDetailResult> {
  const page = await loadVnextProjectDocuments(userId, projectId);
  if (page.access === "denied") return { access: "denied" };
  if (page.error) return { access: "error", message: page.error };
  const document = page.documents.find((entry) => entry.id === documentId) ?? null;
  if (!document) return { access: "missing" };
  return { access: "ok", document };
}

export async function loadVnextDocumentFile(userId: string, projectId: string, documentId: string) {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return null;
  return readClientDocumentFile(admin, projectId, documentId);
}

function folderChoices(documents: VnextClientDocument[]): VnextDocumentFolder[] {
  const byId = new Map<string, string>();
  for (const document of documents) {
    if (!byId.has(document.folderId)) byId.set(document.folderId, document.folderLabel);
  }
  return [...byId.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
