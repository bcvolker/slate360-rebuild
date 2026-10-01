import { isDeliverableSentinel } from "@/lib/slatedrop/deliverable-sentinel";
import { folderDisplayLabel, isClientDocumentFolder } from "./client-visibility";
import {
  canOpenInBrowser,
  documentTypeLabel,
  fileExtension,
  formatFileSize,
  isImageExtension,
} from "./document-language";
import type { VnextClientDocument } from "./document-types";

export type DocumentFolderRow = {
  id: string;
  name: string;
  folderType: string | null;
  projectId: string | null;
};

export type DocumentFileRow = {
  id: string;
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  folderId: string | null;
  projectId: string | null;
  s3Key: string | null;
  createdAt: string | null;
  status: string | null;
};

export function clientFolderMap(folders: DocumentFolderRow[], projectId: string): Map<string, DocumentFolderRow> {
  const visible = new Map<string, DocumentFolderRow>();
  for (const folder of folders) {
    if (folder.projectId !== projectId) continue;
    if (!isClientDocumentFolder({ folderType: folder.folderType, name: folder.name })) continue;
    visible.set(folder.id, folder);
  }
  return visible;
}

export function isClientFile(row: DocumentFileRow, folders: Map<string, DocumentFolderRow>, projectId: string): boolean {
  if (row.status !== "active") return false;
  if (!row.s3Key || isDeliverableSentinel(row.s3Key)) return false;
  if (row.projectId && row.projectId !== projectId) return false;
  if (!row.folderId || !folders.has(row.folderId)) return false;
  return true;
}

export function assembleClientDocument(
  row: DocumentFileRow,
  folder: DocumentFolderRow,
  options: {
    projectId: string;
    dateLabel: string;
    related: { title: string; href: string } | null;
  },
): VnextClientDocument {
  const extension = fileExtension(row.fileName);
  const canOpen = canOpenInBrowser(extension);
  const fileBase = `/api/vnext/projects/${options.projectId}/documents/${row.id}/file`;
  return {
    id: row.id,
    displayName: row.fileName.replace(/\.[^.]+$/, "") || row.fileName,
    filename: row.fileName,
    typeLabel: documentTypeLabel(extension),
    extension,
    sizeLabel: formatFileSize(row.fileSize),
    dateLabel: options.dateLabel,
    folderId: folder.id,
    folderLabel: folderDisplayLabel(folder.name),
    canOpen,
    canDownload: true,
    openHref: canOpen ? `${fileBase}?disposition=inline` : null,
    downloadHref: `${fileBase}?disposition=attachment`,
    previewHref: isImageExtension(extension) ? `${fileBase}?disposition=inline` : null,
    related: options.related,
  };
}
