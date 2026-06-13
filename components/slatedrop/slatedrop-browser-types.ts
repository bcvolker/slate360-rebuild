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
};

export type SlateDropBrowserShellProps = {
  folders: SlateDropBrowseFolder[];
  maxStorageGB: number;
};
