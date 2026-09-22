import "server-only";

import { getScopedProjectForUser } from "@/lib/projects/access";
import { vnextProjectHref } from "@/lib/vnext/nav";
import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";
import { readProjectPlans } from "@/lib/vnext/plans/read-project-plans";
import { withPlanSheetLinks } from "@/lib/vnext/plans/assemble-plans";
import type { VnextProjectPlanSet } from "@/lib/vnext/plans/plan-types";
import type { VnextClientDocument, VnextDocumentFolder, VnextSearchHit } from "./document-types";
import { readClientDocumentFile, readProjectDocuments } from "./read-project-documents";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";

export type DocumentsPageResult =
  | { access: "denied" }
  | { access: "hidden" }
  | {
      access: "ok";
      documents: VnextClientDocument[];
      hits: VnextSearchHit[];
      folders: VnextDocumentFolder[];
      planSets: VnextProjectPlanSet[];
      canUploadPlans: boolean;
      error: string | null;
    };

export async function loadVnextProjectDocuments(userId: string, projectId: string): Promise<DocumentsPageResult> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id, org_id");
  if (!project) return { access: "denied" };
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "documents")) return { access: "hidden" };
  const plansIncluded = canClientSeeCapability(scope, "plans");
  const itemsIncluded = canClientSeeCapability(scope, "items");
  const base = vnextProjectHref(projectId);
  const documentsBase = `${base}/documents`;
  const read = await readProjectDocuments(admin, projectId, {
    documentsBase,
    itemsBase: `${base}/items`,
    exploreBase: `${base}/explore`,
  });
  const planSets = plansIncluded
    ? await readProjectPlans(admin, projectId, {
        documents: read.documents,
        documentsBase,
        exploreBase: `${base}/explore`,
      }).catch(() => [] as VnextProjectPlanSet[])
    : [];
  const documents = withPlanSheetLinks(read.documents, planSets, documentsBase);
  const orgId = (project as { org_id?: string | null }).org_id ?? null;
  const canUploadPlans = plansIncluded
    ? await userCanManageVnextProject(admin, userId, projectId, orgId).catch(() => false)
    : false;
  const hits = read.hits.filter((hit) => {
    if (hit.kind === "plan") return plansIncluded;
    if (hit.kind === "item") return itemsIncluded;
    return true;
  });
  const folders = folderChoices(documents);
  return { access: "ok", documents, hits, folders, planSets, canUploadPlans, error: read.error };
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
  if (page.access !== "ok") return { access: "missing" };
  if (page.error) return { access: "error", message: page.error };
  const document = page.documents.find((entry) => entry.id === documentId) ?? null;
  if (!document) return { access: "missing" };
  return { access: "ok", document };
}

export async function loadVnextDocumentFile(userId: string, projectId: string, documentId: string) {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return null;
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "documents")) return null;
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
