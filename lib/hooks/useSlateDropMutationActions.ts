"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";
import { findFolder, findFolderIdPath } from "@/lib/slatedrop/client-utils";
import type { SlateDropFileItem } from "@/lib/hooks/useSlateDropFiles";

type ShowToast = (text: string, ok?: boolean) => void;

type RenameModalState = { id: string; name: string; type: "file" | "folder" } | null;
type NewFolderModalState = { parentId: string; name: string } | null;
type DeleteConfirmState = { id: string; name: string; type: "file" | "folder" | "project" } | null;
type MoveModalState = { id: string; name: string; type: "file" } | null;

type UseSlateDropMutationActionsParams = {
  activeFolderId: string;
  folderTree: FolderNode[];
  sandboxProjects: Array<{ id: string }>;
  moveModal: MoveModalState;
  getProjectIdForFolder: (folderId: string) => string | null;
  refreshFolderFiles: (folderId: string) => Promise<void>;
  refreshSandboxProjects: () => Promise<void>;
  showToast: ShowToast;
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
  setActiveFolderId: Dispatch<SetStateAction<string>>;
  setRealFiles: Dispatch<SetStateAction<Record<string, SlateDropFileItem[]>>>;
  setNewFolderModal: Dispatch<SetStateAction<NewFolderModalState>>;
  setRenameModal: Dispatch<SetStateAction<RenameModalState>>;
  setDeleteConfirm: Dispatch<SetStateAction<DeleteConfirmState>>;
  setMoveModal: Dispatch<SetStateAction<MoveModalState>>;
};

export function useSlateDropMutationActions({
  activeFolderId,
  folderTree,
  sandboxProjects,
  moveModal,
  getProjectIdForFolder,
  refreshFolderFiles,
  refreshSandboxProjects,
  showToast,
  setExpandedIds,
  setActiveFolderId,
  setRealFiles,
  setNewFolderModal,
  setRenameModal,
  setDeleteConfirm,
  setMoveModal,
}: UseSlateDropMutationActionsParams) {
  const handleCreateFolder = useCallback(async (parentFolderId: string, folderName: string) => {
    const projectId = getProjectIdForFolder(parentFolderId);
    if (!projectId) {
      showToast("Choose a project folder first to create a new folder.", false);
      return;
    }

    try {
      const response = await fetch("/api/slatedrop/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          parentFolderId: parentFolderId === projectId ? null : parentFolderId,
          name: folderName,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Create folder failed" }));
        throw new Error(payload.error ?? "Create folder failed");
      }

      const data = await response.json().catch(() => ({}));
      await refreshSandboxProjects();
      const createdFolderId = typeof data?.folder?.id === "string" ? data.folder.id : null;
      if (createdFolderId) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.add(projectId);
          next.add(parentFolderId);
          return next;
        });
        setActiveFolderId(createdFolderId);
      }
      showToast(`Folder "${folderName}" created`);
      setNewFolderModal(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Create folder failed", false);
    }
  }, [getProjectIdForFolder, refreshSandboxProjects, setActiveFolderId, setExpandedIds, setNewFolderModal, showToast]);

  const handleRename = useCallback(async (
    renameTarget: { id: string; name: string; type: "file" | "folder" },
    nextName: string
  ) => {
    if (renameTarget.type === "file") {
      try {
        const response = await fetch("/api/slatedrop/rename", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: renameTarget.id, newName: nextName }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Rename failed" }));
          throw new Error(payload.error ?? "Rename failed");
        }
        setRealFiles((prev) => {
          const folderFiles = prev[activeFolderId] ?? [];
          return {
            ...prev,
            [activeFolderId]: folderFiles.map((file) =>
              file.id === renameTarget.id ? { ...file, name: nextName } : file
            ),
          };
        });
        await refreshFolderFiles(activeFolderId);
        showToast(`Renamed to "${nextName}"`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Rename failed", false);
        return;
      }
    } else {
      try {
        const response = await fetch("/api/slatedrop/folders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: renameTarget.id, newName: nextName }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Rename failed" }));
          throw new Error(payload.error ?? "Rename failed");
        }
        await refreshSandboxProjects();
        showToast(`Renamed to "${nextName}"`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Rename failed", false);
        return;
      }
    }

    setRenameModal(null);
  }, [activeFolderId, refreshFolderFiles, refreshSandboxProjects, setRealFiles, setRenameModal, showToast]);

  const handleDeleteConfirmAction = useCallback(async (
    target: { id: string; name: string; type: "file" | "folder" | "project" },
    projectConfirmName: string
  ) => {
    if (target.type === "file") {
      try {
        const response = await fetch("/api/slatedrop/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: target.id }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Delete failed" }));
          throw new Error(payload.error ?? "Delete failed");
        }
        setRealFiles((prev) => ({
          ...prev,
          [activeFolderId]: (prev[activeFolderId] ?? []).filter((file) => file.id !== target.id),
        }));
        await refreshFolderFiles(activeFolderId);
        showToast(`"${target.name}" deleted`);
        setDeleteConfirm(null);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Delete failed", false);
      }
      return;
    }

    if (target.type === "project") {
      if (projectConfirmName.trim() !== target.name) {
        showToast("Project name does not match. Please type the exact name.", false);
        return;
      }

      const sandboxProjectExists = sandboxProjects.some((project) => project.id === target.id);
      if (!sandboxProjectExists) {
        showToast("Project not found.", false);
        setDeleteConfirm(null);
        return;
      }

      try {
        const response = await fetch(`/api/projects/${target.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmText: "DELETE",
            confirmName: projectConfirmName.trim(),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Delete failed" }));
          throw new Error(payload.error ?? "Delete failed");
        }

        const activeProjectId = getProjectIdForFolder(activeFolderId);
        await refreshSandboxProjects();
        if (activeProjectId === target.id) {
          setActiveFolderId("projects");
        }
        showToast(`Project "${target.name}" deleted`);
        setDeleteConfirm(null);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Delete failed", false);
      }
      return;
    }

    try {
      const parentFolderId = findFolder(folderTree, target.id)?.parentId ?? "projects";
      const response = await fetch("/api/slatedrop/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: target.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(payload.error ?? "Delete failed");
      }

      setRealFiles((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      await refreshSandboxProjects();
      if (activeFolderId === target.id) {
        setActiveFolderId(parentFolderId);
      }
      showToast(`Folder "${target.name}" deleted`);
      setDeleteConfirm(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Delete failed", false);
    }
  }, [activeFolderId, folderTree, getProjectIdForFolder, refreshFolderFiles, refreshSandboxProjects, sandboxProjects, setActiveFolderId, setDeleteConfirm, setRealFiles, showToast]);

  const handleMoveFile = useCallback(async (fileId: string, targetFolderId: string) => {
    if (!moveModal) {
      setMoveModal(null);
      return;
    }

    const fullPath = findFolderIdPath(folderTree, targetFolderId) || targetFolderId;

    try {
      const response = await fetch("/api/slatedrop/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          newFolderId: targetFolderId,
          newS3KeyPrefix: `orgs/default/${fullPath}`,
        }),
      });

      if (!response.ok) throw new Error("Move failed");

      setRealFiles((prev) => {
        const next = { ...prev };
        if (next[activeFolderId]) {
          const fileToMove = next[activeFolderId].find((file) => file.id === moveModal.id);
          if (fileToMove) {
            next[activeFolderId] = next[activeFolderId].filter((file) => file.id !== moveModal.id);
            if (next[targetFolderId]) {
              next[targetFolderId] = [...next[targetFolderId], { ...fileToMove, folderId: targetFolderId }];
            }
          }
        }
        return next;
      });

      showToast("Moved to folder");
      setMoveModal(null);
    } catch {
      showToast("Failed to move file", false);
    }
  }, [activeFolderId, folderTree, moveModal, setMoveModal, setRealFiles, showToast]);

  return {
    handleCreateFolder,
    handleRename,
    handleDeleteConfirmAction,
    handleMoveFile,
  };
}