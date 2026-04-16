"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SlateDropFileItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  modified: string;
  folderId: string;
  s3Key?: string;
  thumbnail?: string;
  locked?: boolean;
};

type SortKey = "name" | "modified" | "size" | "type";
type SortDir = "asc" | "desc";

type UseSlateDropFilesArgs = {
  activeFolderId: string;
  searchQuery: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function useSlateDropFiles({ activeFolderId, searchQuery, sortKey, sortDir }: UseSlateDropFilesArgs) {
  const [realFiles, setRealFiles] = useState<Record<string, SlateDropFileItem[]>>({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesLoadErrorByFolder, setFilesLoadErrorByFolder] = useState<Record<string, boolean>>({});

  const refreshFolderFiles = useCallback(async (folderId: string) => {
    if (!folderId) {
      setRealFiles((prev) => ({ ...prev, [folderId]: [] }));
      return;
    }
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(folderId)}`);
      if (!res.ok) {
        setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: true }));
        return;
      }
      const payload = await res.json();
      const files = Array.isArray(payload?.files) ? (payload.files as SlateDropFileItem[]) : [];
      setRealFiles((prev) => ({ ...prev, [folderId]: files }));
      setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: false }));
    } catch {
      setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: true }));
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (!activeFolderId) {
      return;
    }
    void refreshFolderFiles(activeFolderId);
  }, [activeFolderId, refreshFolderFiles]);

  const currentFiles = useMemo(() => {
    const hasLoadedRealFolder = Object.prototype.hasOwnProperty.call(realFiles, activeFolderId);
    let files = hasLoadedRealFolder ? realFiles[activeFolderId] ?? [] : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      files = files.filter((f) => f.name.toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...files].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "modified":
          return dir * a.modified.localeCompare(b.modified);
        case "size":
          return dir * (a.size - b.size);
        case "type":
          return dir * a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  }, [activeFolderId, realFiles, searchQuery, sortKey, sortDir]);

  return {
    realFiles,
    setRealFiles,
    loadingFiles,
    filesLoadErrorByFolder,
    refreshFolderFiles,
    currentFiles,
  };
}
