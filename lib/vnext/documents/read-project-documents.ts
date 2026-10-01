import "server-only";

import { formatPlainDate } from "@/lib/vnext/overview-visit";
import { planSheetHasImage } from "@/lib/vnext/explore/resolve-plan-source";
import { publishedIdSet, readProjectPublications } from "@/lib/vnext/release/read-publications";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { isDeliverableSentinel } from "@/lib/slatedrop/deliverable-sentinel";
import {
  assembleClientDocument,
  clientFolderMap,
  isClientFile,
  type DocumentFileRow,
  type DocumentFolderRow,
} from "./assemble-document";
import { DOCUMENTS_LOAD_ERROR } from "./document-language";
import type { VnextClientDocument } from "./document-types";
import { buildProjectSearchHits, type SearchItemInput, type SearchPlanInput } from "./project-search";
import type { VnextSearchHit } from "./document-types";

type Admin = {
  from: (table: string) => {
    select: (columns: string) => unknown;
  };
};

type Query = {
  eq: (column: string, value: string) => Query;
  in: (column: string, values: string[]) => Query;
  is: (column: string, value: null) => Query;
  order: (column: string, options: { ascending: boolean }) => Query;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  then: PromiseLike<{ data: unknown; error: { message: string } | null }>["then"];
};

function queryOf(admin: Admin, table: string, columns: string): Query {
  return (admin.from(table) as { select: (columns: string) => Query }).select(columns);
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export type DocumentsRead = {
  documents: VnextClientDocument[];
  hits: VnextSearchHit[];
  error: string | null;
};

export async function readProjectDocuments(
  admin: Admin,
  projectId: string,
  bases: { documentsBase: string; itemsBase: string; exploreBase: string },
): Promise<DocumentsRead> {
  const folderRes = await queryOf(admin, "project_folders", "id, name, folder_type, project_id").eq("project_id", projectId);
  if (folderRes && "error" in (folderRes as object) && (folderRes as { error: { message: string } | null }).error) {
    return { documents: [], hits: [], error: DOCUMENTS_LOAD_ERROR };
  }
  const folderRows = asRows<{ id: string; name: string; folder_type: string | null; project_id: string | null }>(
    (folderRes as { data: unknown }).data,
  );
  const folders: DocumentFolderRow[] = folderRows.map((row) => ({
    id: row.id,
    name: row.name,
    folderType: row.folder_type,
    projectId: row.project_id,
  }));
  const visible = clientFolderMap(folders, projectId);
  const folderIds = [...visible.keys()];

  let files: DocumentFileRow[] = [];
  if (folderIds.length > 0) {
    const fileRes = await queryOf(
      admin,
      "slatedrop_uploads",
      "id, file_name, file_size, file_type, folder_id, project_id, s3_key, created_at, status, deleted_at",
    )
      .in("folder_id", folderIds)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if ((fileRes as { error: { message: string } | null }).error) {
      return { documents: [], hits: [], error: DOCUMENTS_LOAD_ERROR };
    }
    files = asRows<{
      id: string;
      file_name: string;
      file_size: number | null;
      file_type: string | null;
      folder_id: string | null;
      project_id: string | null;
      s3_key: string | null;
      created_at: string | null;
      status: string | null;
    }>((fileRes as { data: unknown }).data).map((row) => ({
      id: row.id,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileType: row.file_type,
      folderId: row.folder_id,
      projectId: row.project_id,
      s3Key: row.s3_key,
      createdAt: row.created_at,
      status: row.status,
    }));
  }

  const clientFiles = files.filter((file) => isClientFile(file, visible, projectId));
  const related = await relatedItems(admin, projectId, clientFiles.map((file) => file.id), bases.itemsBase);
  const documents = clientFiles.map((file) => {
    const folder = visible.get(file.folderId as string) as DocumentFolderRow;
    return assembleClientDocument(file, folder, {
      projectId,
      dateLabel: formatPlainDate(file.createdAt) ?? "",
      related: related.get(file.id) ?? null,
    });
  });

  const [items, plans] = await Promise.all([readSearchItems(admin, projectId), readSearchPlans(admin, projectId)]);
  const hits = buildProjectSearchHits({
    projectId,
    ...bases,
    documents,
    items,
    plans,
  });
  return { documents, hits, error: null };
}

async function relatedItems(
  admin: Admin,
  projectId: string,
  fileIds: string[],
  itemsBase: string,
): Promise<Map<string, { title: string; href: string }>> {
  const links = new Map<string, { title: string; href: string }>();
  if (fileIds.length === 0) return links;
  const assetRes = await queryOf(admin, "site_walk_deliverable_assets", "file_id, source_item_id")
    .eq("project_id", projectId)
    .in("file_id", fileIds);
  if ((assetRes as { error: unknown }).error) return links;
  const pairs = asRows<{ file_id: string | null; source_item_id: string | null }>((assetRes as { data: unknown }).data);
  const itemIds = [...new Set(pairs.map((pair) => pair.source_item_id).filter((id): id is string => Boolean(id)))];
  if (itemIds.length === 0) return links;
  let itemQuery = queryOf(admin, "site_walk_items", "id, title").eq("project_id", projectId).in("id", itemIds);
  itemQuery = excludeDeletedSiteWalkItems(itemQuery as never) as unknown as Query;
  const itemRes = await itemQuery;
  if ((itemRes as { error: unknown }).error) return links;
  const titles = new Map(
    asRows<{ id: string; title: string | null }>((itemRes as { data: unknown }).data).map((row) => [
      row.id,
      row.title?.trim() || "Untitled item",
    ]),
  );
  for (const pair of pairs) {
    if (!pair.file_id || !pair.source_item_id || links.has(pair.file_id)) continue;
    const title = titles.get(pair.source_item_id);
    if (!title) continue;
    links.set(pair.file_id, { title, href: `${itemsBase}/${pair.source_item_id}` });
  }
  return links;
}

async function readSearchItems(admin: Admin, projectId: string): Promise<SearchItemInput[]> {
  let itemQuery = queryOf(
    admin,
    "site_walk_items",
    "id, title, description, location_label, trade, category, tags, captured_at, item_type",
  ).eq("project_id", projectId);
  itemQuery = excludeDeletedSiteWalkItems(itemQuery as never) as unknown as Query;
  const res = await itemQuery;
  if ((res as { error: unknown }).error) return [];
  const itemRows = asRows<{
    id: string;
    title: string | null;
    description: string | null;
    location_label: string | null;
    trade: string | null;
    category: string | null;
    tags: string[] | null;
    captured_at: string | null;
    item_type: string | null;
  }>((res as { data: unknown }).data);
  let publishedPano = new Set<string>();
  try {
    publishedPano = publishedIdSet(await readProjectPublications(admin, projectId), projectId, "pano360");
  } catch {
    publishedPano = new Set();
  }
  return itemRows.filter((row) => row.item_type !== "photo_360" || publishedPano.has(row.id)).map((row) => ({
    id: row.id,
    title: row.title?.trim() || "Untitled item",
    description: row.description,
    locationLabel: row.location_label,
    trade: row.trade,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    dateLabel: formatPlainDate(row.captured_at) ?? "",
  }));
}

async function readSearchPlans(admin: Admin, projectId: string): Promise<SearchPlanInput[]> {
  const res = await queryOf(
    admin,
    "site_walk_plan_sheets",
    "id, sheet_name, sheet_number, thumbnail_s3_key, rasterized_key, image_s3_key, updated_at",
  ).eq("project_id", projectId);
  if ((res as { error: unknown }).error) return [];
  let publishedPlans = new Set<string>();
  try {
    publishedPlans = publishedIdSet(await readProjectPublications(admin, projectId), projectId, "plans");
  } catch {
    return [];
  }
  return asRows<{
    id: string;
    sheet_name: string | null;
    sheet_number: number | null;
    thumbnail_s3_key: string | null;
    rasterized_key: string | null;
    image_s3_key: string | null;
    updated_at: string | null;
  }>((res as { data: unknown }).data)
    .filter((row) => planSheetHasImage(row) && publishedPlans.has(row.id))
    .map((row) => ({
      id: row.id,
      label: row.sheet_name?.trim() || `Sheet ${row.sheet_number ?? ""}`.trim(),
      sheetNumber: row.sheet_number == null ? null : String(row.sheet_number),
      dateLabel: formatPlainDate(row.updated_at) ?? "",
    }));
}

export async function readClientDocumentFile(
  admin: Admin,
  projectId: string,
  documentId: string,
): Promise<{ filename: string; s3Key: string; extension: string | null } | null> {
  const fileRes = await queryOf(
    admin,
    "slatedrop_uploads",
    "id, file_name, file_type, folder_id, project_id, s3_key, status, deleted_at",
  )
    .eq("id", documentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  const row = (fileRes as { data: Record<string, unknown> | null; error: unknown }).data;
  if ((fileRes as { error: unknown }).error || !row) return null;
  if (row.project_id && row.project_id !== projectId) return null;
  const s3Key = typeof row.s3_key === "string" ? row.s3_key : null;
  const folderId = typeof row.folder_id === "string" ? row.folder_id : null;
  const fileName = typeof row.file_name === "string" ? row.file_name : "";
  if (!s3Key || !folderId || isDeliverableSentinel(s3Key)) return null;

  const folderRes = await queryOf(admin, "project_folders", "id, name, folder_type, project_id")
    .eq("id", folderId)
    .eq("project_id", projectId)
    .maybeSingle();
  const folder = (folderRes as { data: { id: string; name: string; folder_type: string | null; project_id: string | null } | null })
    .data;
  if (!folder) return null;
  const file: DocumentFileRow = {
    id: documentId,
    fileName,
    fileSize: null,
    fileType: typeof row.file_type === "string" ? row.file_type : null,
    folderId,
    projectId: typeof row.project_id === "string" ? row.project_id : null,
    s3Key,
    createdAt: null,
    status: "active",
  };
  const folders = clientFolderMap(
    [{ id: folder.id, name: folder.name, folderType: folder.folder_type, projectId: folder.project_id }],
    projectId,
  );
  if (!isClientFile(file, folders, projectId)) return null;
  return { filename: fileName, s3Key, extension: fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? null : null };
}
