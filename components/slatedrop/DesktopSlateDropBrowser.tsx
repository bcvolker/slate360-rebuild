"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upload } from "lucide-react";
import {
  SlateDropBrowserEmptyFiles,
  SlateDropBrowserFileTableRow,
} from "./SlateDropBrowserFileRows";
import { SlateDropBrowserFolderTree } from "./SlateDropBrowserFolders";
import { formatStorageLabel, SlateDropStorageRing } from "./SlateDropStorageRing";
import { slatedropBrowserTokens as t } from "./slatedrop-browser-tokens";
import type { ReturnTypeUseSlateDropBrowserData } from "./useSlateDropBrowserData";

export function DesktopSlateDropBrowser({
  folders,
  files,
  storageUsedGb,
  storageLimitGb,
  searchQuery,
  setSearchQuery,
  loading,
}: ReturnTypeUseSlateDropBrowserData) {
  const pathname = usePathname() ?? "/slatedrop";

  return (
    <div className={t.desktopSplit}>
      <aside className={t.desktopSidebar}>
        <div className="mb-4 flex items-center gap-3">
          <SlateDropStorageRing usedGb={storageUsedGb} limitGb={storageLimitGb} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--graphite-text-header)]">SlateDrop</p>
            <p className="text-xs text-[var(--graphite-muted)]">
              {formatStorageLabel(storageUsedGb, storageLimitGb)}
            </p>
          </div>
        </div>

        <p className={`${t.sectionLabel} mb-3`}>Folders</p>
        <SlateDropBrowserFolderTree folders={folders} activeHref={pathname} />
      </aside>

      <div className={t.desktopMain}>
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search files…"
            className={t.searchInputDesktop}
            aria-label="Search files"
          />
          <Link href="/slatedrop/upload" className={t.uploadButtonDesktop}>
            <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Upload
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {files.length > 0 ? (
            <table className="w-full text-sm">
              <thead className={t.tableHead}>
                <tr>
                  <th className="py-2 text-left font-medium">Name</th>
                  <th className="py-2 text-center font-medium">Date</th>
                  <th className="py-2 text-right font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <SlateDropBrowserFileTableRow key={file.id} file={file} />
                ))}
              </tbody>
            </table>
          ) : (
            <SlateDropBrowserEmptyFiles loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}
