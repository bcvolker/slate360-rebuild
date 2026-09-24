import { planSheetHasImage } from "@/lib/vnext/explore/resolve-plan-source";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import type { VnextClientDocument } from "@/lib/vnext/documents/document-types";
import type { VnextProjectPlanSet } from "./plan-types";

export type PlanSetRow = {
  id: string;
  projectId: string;
  title: string;
  kind: string | null;
  revisionNumber: number | null;
  revisionLabel: string | null;
  processingStatus: string | null;
  sourceFileId: string | null;
  archived: boolean;
};

export type PlanSheetRow = {
  id: string;
  projectId: string;
  planSetId: string;
  sheetName: string | null;
  sheetNumber: number | null;
  sortOrder: number | null;
  thumbnailKey: unknown;
  rasterizedKey: unknown;
  imageKey: unknown;
};

const PLAN_FOLDER_TYPES = new Set(["drawings", "site_walk_plans"]);
const MAX_PLAN_BYTES = 50 * 1024 * 1024;

export function rejectPlanFile(filename: string, size: number, pageCount: number): { status: 400; error: string } | null {
  if (!filename.toLowerCase().endsWith(".pdf")) return { status: 400, error: "Project plans are PDF drawings." };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PLAN_BYTES) {
    return { status: 400, error: "Plan PDFs must be 50 MB or smaller." };
  }
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 250) {
    return { status: 400, error: "A plan set must be between 1 and 250 sheets." };
  }
  return null;
}

export function isPlanUploadFolder(folder: { folderType: string | null; name: string | null }): boolean {
  if (folder.folderType && PLAN_FOLDER_TYPES.has(folder.folderType)) return true;
  const name = (folder.name ?? "").replace(/^\d+_/, "").replace(/_/g, " ").trim().toLowerCase();
  return name === "drawings" || name === "plans";
}

export function assembleProjectPlans(
  projectId: string,
  sets: PlanSetRow[],
  sheets: PlanSheetRow[],
  documents: VnextClientDocument[],
  documentsBase: string,
  exploreBase: string,
): VnextProjectPlanSet[] {
  const docsById = new Map(documents.map((document) => [document.id, document]));
  return sets
    .filter((set) => set.projectId === projectId && !set.archived && (set.kind ?? "master") === "master")
    .map((set) => {
      const sourceDoc = set.sourceFileId ? docsById.get(set.sourceFileId) ?? null : null;
      const setSheets = sheets
        .filter((sheet) => sheet.projectId === projectId && sheet.planSetId === set.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((sheet) => {
          const renderable = planSheetHasImage({
            thumbnail_s3_key: sheet.thumbnailKey,
            rasterized_key: sheet.rasterizedKey,
            image_s3_key: sheet.imageKey,
          });
          const label = sheet.sheetName?.trim() || `Sheet ${sheet.sheetNumber ?? ""}`.trim();
          return {
            id: sheet.id,
            label,
            exploreHref: renderable ? vnextExploreHref(exploreBase, { rep: "plan", source: sheet.id }) : null,
            statusLabel: renderable ? null : set.processingStatus === "failed" ? "Could not be prepared" : "Preparing",
          };
        });
      return {
        id: set.id,
        title: set.title.trim() || "Project plans",
        revisionLabel: revisionLabel(set),
        source: sourceDoc
          ? { documentId: sourceDoc.id, title: sourceDoc.displayName, href: `${documentsBase}/${sourceDoc.id}` }
          : null,
        sheets: setSheets,
      };
    });
}

export function withPlanSheetLinks(
  documents: VnextClientDocument[],
  planSets: VnextProjectPlanSet[],
  documentsBase: string,
): VnextClientDocument[] {
  const hrefByDocument = new Map<string, string>();
  for (const set of planSets) {
    if (set.source) hrefByDocument.set(set.source.documentId, `${documentsBase}#plan-${set.id}`);
  }
  return documents.map((document) => {
    const sheetsHref = hrefByDocument.get(document.id) ?? null;
    return sheetsHref ? { ...document, sheetsHref } : document;
  });
}

function revisionLabel(set: PlanSetRow): string | null {
  const label = set.revisionLabel?.trim();
  if (label) return label;
  if ((set.revisionNumber ?? 1) > 1) return `Rev ${set.revisionNumber}`;
  return null;
}
