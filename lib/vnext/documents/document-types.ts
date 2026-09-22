export type VnextClientDocument = {
  id: string;
  displayName: string;
  filename: string;
  typeLabel: string;
  extension: string | null;
  sizeLabel: string | null;
  dateLabel: string;
  folderId: string;
  folderLabel: string;
  canOpen: boolean;
  canDownload: boolean;
  openHref: string | null;
  downloadHref: string | null;
  /** Inline image for the detail page. Null when the file is not an image. */
  previewHref: string | null;
  related: { title: string; href: string } | null;
};

export type VnextSearchKind = "document" | "item" | "plan";

export type VnextSearchHit = {
  id: string;
  kind: VnextSearchKind;
  title: string;
  context: string;
  href: string;
  searchText: string;
};

export type VnextDocumentFolder = {
  id: string;
  label: string;
};
