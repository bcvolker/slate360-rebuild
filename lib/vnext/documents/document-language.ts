const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const OPEN_EXTENSIONS = new Set(["pdf", ...IMAGE_EXTENSIONS]);

export const DOCUMENTS_EMPTY_COPY = "No project documents have been published yet.";
export const DOCUMENTS_SEARCH_EMPTY_COPY = "No results for this search.";
export const DOCUMENTS_FOLDER_EMPTY_COPY = "No documents in this folder.";
export const DOCUMENTS_LOAD_ERROR = "Documents could not be loaded. Try again.";

export function fileExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return null;
  const ext = filename.slice(dot + 1).toLowerCase();
  if (!/^[a-z0-9]{1,5}$/.test(ext)) return null;
  return ext;
}

export function documentTypeLabel(extension: string | null): string {
  if (!extension) return "File";
  if (extension === "pdf") return "PDF";
  if (IMAGE_EXTENSIONS.has(extension)) return "Image";
  if (extension === "xlsx" || extension === "xls" || extension === "csv") return "Spreadsheet";
  if (extension === "doc" || extension === "docx") return "Word";
  if (extension === "txt") return "Text";
  if (extension === "dwg") return "Drawing";
  return extension.toUpperCase();
}

export function canOpenInBrowser(extension: string | null): boolean {
  return extension != null && OPEN_EXTENSIONS.has(extension);
}

export function isImageExtension(extension: string | null): boolean {
  return extension != null && IMAGE_EXTENSIONS.has(extension);
}

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  const rounded = mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1);
  return `${rounded} MB`;
}

export function contentTypeForExtension(extension: string | null): string {
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

export function matchesText(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}
