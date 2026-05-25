"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildProjectSlateDropFolderTree } from "@/lib/slatedrop/folderTree";
import type { ProjectFolderSummary } from "@/lib/slatedrop/folderTree";
import type { SlateDropPickerFile, SlateDropPickerFolder } from "@/lib/slatedrop/file-picker-types";

function toPickerFolder(node: {
  id: string;
  name: string;
  parentId: string | null;
  children: Array<{ id: string; name: string; parentId: string | null; children: unknown[] }>;
}, path: string): SlateDropPickerFolder {
  return {
    id: node.id,
    name: node.name,
    path,
    parentId: node.parentId,
    children: node.children.map((child) =>
      toPickerFolder(child as typeof node, path ? `${path}/${child.name}` : child.name),
    ),
  };
}

function flattenFolders(folders: SlateDropPickerFolder[]): SlateDropPickerFolder[] {
  const rows: SlateDropPickerFolder[] = [];
  for (const folder of folders) {
    rows.push(folder);
    if (folder.children.length > 0) rows.push(...flattenFolders(folder.children));
  }
  return rows;
}

export function useSlateDropFilePicker(projectId: string | null, enabled = true) {
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [rootFolders, setRootFolders] = useState<SlateDropPickerFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<SlateDropPickerFile[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allFolders = useMemo(() => flattenFolders(rootFolders), [rootFolders]);
  const activeFolder = useMemo(
    () => allFolders.find((folder) => folder.id === activeFolderId) ?? null,
    [activeFolderId, allFolders],
  );
  const childFolders = useMemo(() => {
    if (!activeFolder) return [];
    return activeFolder.children;
  }, [activeFolder]);

  const refreshFolders = useCallback(async () => {
    if (!projectId || !enabled) {
      setRootFolders([]);
      setActiveFolderId(null);
      return;
    }

    setFoldersLoading(true);
    try {
      const response = await fetch(
        `/api/slatedrop/project-folders?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRootFolders([]);
        setActiveFolderId(null);
        return;
      }

      const summaries = Array.isArray(payload?.folders)
        ? (payload.folders as ProjectFolderSummary[])
        : [];
      const tree = buildProjectSlateDropFolderTree(summaries);
      const pickerRoots = tree.map((node) => toPickerFolder(node, node.name));
      setRootFolders(pickerRoots);
      setActiveFolderId((prev) => {
        const all = flattenFolders(pickerRoots);
        if (prev && all.some((folder) => folder.id === prev)) return prev;
        return pickerRoots[0]?.id ?? null;
      });
    } finally {
      setFoldersLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    void refreshFolders();
  }, [refreshFolders]);

  useEffect(() => {
    if (!activeFolderId || !enabled) {
      setFiles([]);
      setFilesError(null);
      return;
    }

    let cancelled = false;
    setFilesLoading(true);
    setFilesError(null);

    void (async () => {
      try {
        const response = await fetch(
          `/api/slatedrop/files?folderId=${encodeURIComponent(activeFolderId)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setFiles([]);
          setFilesError("Could not load files.");
          return;
        }
        const rows = Array.isArray(payload?.files) ? payload.files : [];
        setFiles(
          rows.map((file: SlateDropPickerFile) => ({
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type || "file",
            folderId: file.folderId || activeFolderId,
          })),
        );
      } catch {
        if (!cancelled) {
          setFiles([]);
          setFilesError("Could not load files.");
        }
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFolderId, enabled]);

  const toggleFile = useCallback((fileId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedFiles = useMemo(
    () => files.filter((file) => selectedIds.has(file.id)),
    [files, selectedIds],
  );

  const reset = useCallback(() => {
    setSelectedIds(new Set());
    setFilesError(null);
  }, []);

  return {
    foldersLoading,
    rootFolders,
    childFolders,
    activeFolderId,
    setActiveFolderId,
    activeFolder,
    filesLoading,
    files,
    filesError,
    selectedIds,
    selectedFiles,
    toggleFile,
    clearSelection,
    reset,
    refreshFolders,
  };
}
