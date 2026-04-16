"use client";

import { useCallback, useEffect, useState } from "react";
import { buildProjectSlateDropFolderTree, type ProjectFolderSummary, type SlateDropFolderNode } from "@/lib/slatedrop/folderTree";
import { findFolder } from "@/lib/slatedrop/helpers";

type UsageSummary = {
  storageUsedBytes: number;
  fileCount: number;
};

export function useSlateDropProjectScope(initialProjectId?: string) {
  const [folderTree, setFolderTree] = useState<SlateDropFolderNode[]>([]);
  const [activeFolderId, setActiveFolderId] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [usageSummary, setUsageSummary] = useState<UsageSummary>({ storageUsedBytes: 0, fileCount: 0 });

  const refreshFolderTree = useCallback(async () => {
    if (!initialProjectId) {
      setFolderTree([]);
      setActiveFolderId("");
      return;
    }

    try {
      const response = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(initialProjectId)}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFolderTree([]);
        setActiveFolderId("");
        return;
      }

      const folders = Array.isArray(payload?.folders) ? (payload.folders as ProjectFolderSummary[]) : [];
      const nextTree = buildProjectSlateDropFolderTree(folders);
      setFolderTree(nextTree);
      setExpandedIds(new Set(nextTree.filter((node) => node.children.length > 0).map((node) => node.id)));
      setActiveFolderId((prev) => {
        if (prev && findFolder(nextTree, prev)) return prev;
        return nextTree[0]?.id ?? "";
      });
    } catch {
      setFolderTree([]);
      setActiveFolderId("");
    }
  }, [initialProjectId]);

  useEffect(() => {
    void refreshFolderTree();
  }, [refreshFolderTree]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsageSummary() {
      try {
        const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;
        setUsageSummary({
          storageUsedBytes: Number(payload?.storageUsedBytes ?? 0),
          fileCount: Number(payload?.fileCount ?? 0),
        });
      } catch {
        if (!cancelled) {
          setUsageSummary({ storageUsedBytes: 0, fileCount: 0 });
        }
      }
    }

    void loadUsageSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    folderTree,
    activeFolderId,
    setActiveFolderId,
    expandedIds,
    setExpandedIds,
    usageSummary,
    refreshFolderTree,
  };
}