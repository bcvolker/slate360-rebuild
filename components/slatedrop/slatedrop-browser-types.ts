import type { LucideIcon } from "lucide-react";

export type SlateDropBrowseFolder = {
  id: string;
  name: string;
  href: string;
  meta?: string;
  fileCount?: number;
  icon?: LucideIcon;
};

export type SlateDropBrowserFile = {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
  sizeBytes: number;
  /** In-app viewer href when this row is a deliverable LINK sentinel; else undefined. */
  openHref?: string;
};

export type SlateDropBrowserShellProps = {
  folders: SlateDropBrowseFolder[];
  maxStorageGB: number;
};
