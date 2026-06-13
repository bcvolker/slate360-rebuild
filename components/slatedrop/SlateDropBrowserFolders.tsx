import { Folder } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SlateDropBrowseFolder } from "./slatedrop-browser-types";
import { slatedropBrowserTokens as t } from "./slatedrop-browser-tokens";

type SlateDropBrowserFolderGridProps = {
  folders: SlateDropBrowseFolder[];
};

export function SlateDropBrowserFolderGrid({ folders }: SlateDropBrowserFolderGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {folders.map((folder) => {
        const Icon = folder.icon ?? Folder;
        return (
          <Link key={folder.id} href={folder.href} className={t.folderCard}>
            <span className={t.folderIconWell}>
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-[var(--graphite-text-header)]">
                {folder.name}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[var(--graphite-muted)]">
                {folder.fileCount != null
                  ? `${folder.fileCount} files`
                  : folder.meta ?? "Open folder"}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

type SlateDropBrowserFolderTreeProps = {
  folders: SlateDropBrowseFolder[];
  activeHref?: string;
};

export function SlateDropBrowserFolderTree({ folders, activeHref }: SlateDropBrowserFolderTreeProps) {
  return (
    <nav className="space-y-1" aria-label="SlateDrop folders">
      {folders.map((folder) => {
        const Icon = folder.icon ?? Folder;
        const active = activeHref === folder.href;
        return (
          <Link
            key={folder.id}
            href={folder.href}
            className={cn(t.treeLink, active && t.treeLinkActive)}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0 text-[var(--graphite-primary)]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
