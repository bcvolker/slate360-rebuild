/** Project-level logical documents. Reusable across many items and pins. */

export const PROJECT_DOCUMENT_TYPES = [
  "drawing",
  "permit_set",
  "rfi",
  "submittal",
  "spec",
  "contract",
  "purchase_order",
  "change_order",
  "invoice",
  "meeting_minutes",
  "safety",
  "report",
  "photo",
  "thermal_image",
  "screenshot",
  "other",
] as const;

export type ProjectDocumentType = (typeof PROJECT_DOCUMENT_TYPES)[number];

export const DOCUMENT_SOURCES = ["slatedrop", "url", "procore"] as const;
export type DocumentSource = (typeof DOCUMENT_SOURCES)[number];

export const CLIENT_ATTACHABLE_TYPES: ProjectDocumentType[] = ["photo", "screenshot", "other"];

export type ProjectDocument = {
  id: string;
  projectId: string;
  type: ProjectDocumentType;
  title: string;
  slatedropId: string | null;
  sourceProvider: DocumentSource;
  sourceExternalId: string | null;
  sourceUrl: string | null;
};

export type ProcoreLink = {
  provider: "procore";
  externalId: string | null;
  url: string;
};

export function isProjectDocumentType(value: string): value is ProjectDocumentType {
  return PROJECT_DOCUMENT_TYPES.includes(value as ProjectDocumentType);
}

export function clientMayAttach(type: ProjectDocumentType): boolean {
  return CLIENT_ATTACHABLE_TYPES.includes(type);
}

/** Thermal JPGs are files. They never unlock Thermal Studio. */
export function thermalStudioUnlocked(_doc: { type: ProjectDocumentType } | null): boolean {
  return false;
}

export function thermalStudioHref(_doc?: { type: ProjectDocumentType } | null): string | null {
  return null;
}

export function isThermalStudioPath(href: string | null | undefined): boolean {
  return Boolean(href && href.includes("/thermal-studio"));
}

export function procoreDeepLink(doc: Pick<ProjectDocument, "sourceProvider" | "sourceUrl" | "sourceExternalId">): ProcoreLink | null {
  if (doc.sourceProvider !== "procore" || !doc.sourceUrl) return null;
  return { provider: "procore", externalId: doc.sourceExternalId, url: doc.sourceUrl };
}

export function toProjectDocument(row: Record<string, unknown>): ProjectDocument {
  const type = String(row.type ?? "other");
  const source = String(row.source_provider ?? row.sourceProvider ?? "slatedrop");
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? row.projectId),
    type: isProjectDocumentType(type) ? type : "other",
    title: String(row.title ?? "Document"),
    slatedropId: row.slatedrop_id || row.slatedropId ? String(row.slatedrop_id ?? row.slatedropId) : null,
    sourceProvider: DOCUMENT_SOURCES.includes(source as DocumentSource) ? (source as DocumentSource) : "url",
    sourceExternalId: row.source_external_id || row.sourceExternalId ? String(row.source_external_id ?? row.sourceExternalId) : null,
    sourceUrl: typeof row.source_url === "string" ? row.source_url : typeof row.sourceUrl === "string" ? row.sourceUrl : null,
  };
}

export function uniqueDocuments<T extends { id: string }>(docs: T[]): T[] {
  const seen = new Set<string>();
  return docs.filter((doc) => {
    if (seen.has(doc.id)) return false;
    seen.add(doc.id);
    return true;
  });
}

export function reuseDocumentAcrossItems(documentId: string, itemIds: string[]): Array<{ itemId: string; documentId: string }> {
  return itemIds.map((itemId) => ({ itemId, documentId }));
}
