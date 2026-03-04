"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";

type UseSlateDropInteractionHandlersParams = {
  sortKey: "name" | "modified" | "size" | "type";
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
  openContextMenu: (x: number, y: number, target: unknown) => void;
  clearContextMenu: () => void;
  setDragOver: Dispatch<SetStateAction<boolean>>;
  uploadFiles: (fileList: FileList) => Promise<void>;
  setSortKey: Dispatch<SetStateAction<"name" | "modified" | "size" | "type">>;
  setSortDir: Dispatch<SetStateAction<"asc" | "desc">>;
  setSelectedFiles: Dispatch<SetStateAction<Set<string>>>;
  signOutAction: () => Promise<void>;
};

export function useSlateDropInteractionHandlers({
  sortKey,
  setExpandedIds,
  openContextMenu,
  clearContextMenu,
  setDragOver,
  uploadFiles,
  setSortKey,
  setSortDir,
  setSelectedFiles,
  signOutAction,
}: UseSlateDropInteractionHandlersParams) {
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setExpandedIds]);

  const handleContextMenu = useCallback((event: React.MouseEvent, target: unknown) => {
    event.preventDefault();
    event.stopPropagation();
    openContextMenu(event.clientX, event.clientY, target);
  }, [openContextMenu]);

  const handleSignOut = useCallback(async () => {
    await signOutAction();
  }, [signOutAction]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      void uploadFiles(files);
    }
  }, [setDragOver, uploadFiles]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, [setDragOver]);

  const handleDragLeave = useCallback(() => setDragOver(false), [setDragOver]);

  const toggleSort = useCallback((key: "name" | "modified" | "size" | "type") => {
    if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [setSortDir, setSortKey, sortKey]);

  const toggleFileSelect = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelectedFiles]);

  useEffect(() => {
    window.addEventListener("click", clearContextMenu);
    return () => {
      window.removeEventListener("click", clearContextMenu);
    };
  }, [clearContextMenu]);

  return {
    toggleExpand,
    handleContextMenu,
    handleSignOut,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    toggleSort,
    toggleFileSelect,
  };
}