"use client";

import { useCallback, useEffect, useState } from "react";

type SlateDropDbFile = {
  id: string;
  file_name: string;
  s3_key: string;
  file_type: string;
  size: number;
  modified: string;
  folderId: string;
  thumbnail?: string;
  locked?: boolean;
};

type SlateDropItem =
  | { type: "file"; id: string; file_name: string; s3_key: string; file_type: string; size: number; modified: string; folderId: string; thumbnail?: string; locked?: boolean }
  | { type: "folder"; id: string; path: string; name: string; isSystem?: boolean };

type SlateDropContextMenu = {
  x: number;
  y: number;
  target: SlateDropItem;
};

export function useSlateDropUiState() {
  const [contextMenu, setContextMenu] = useState<SlateDropContextMenu | null>(null);

  const [shareModal, setShareModal] = useState<SlateDropDbFile | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePerm, setSharePerm] = useState<"view" | "edit">("view");
  const [shareExpiry, setShareExpiry] = useState("7");
  const [shareSent, setShareSent] = useState(false);

  const [newFolderModal, setNewFolderModal] = useState<{ parentId: string; name: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: "file" | "folder" } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "file" | "folder" | "project" } | null>(null);
  const [deleteProjectConfirmName, setDeleteProjectConfirmName] = useState("");
  const [moveModal, setMoveModal] = useState<{ id: string; name: string; type: "file" } | null>(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<SlateDropDbFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setDeleteProjectConfirmName("");
  }, [deleteConfirm?.id, deleteConfirm?.type]);

  const closeShareModal = useCallback(() => {
    setShareModal(null);
    setShareSent(false);
    setShareEmail("");
  }, []);

  const openShareModal = useCallback((file: SlateDropDbFile) => {
    setShareModal(file);
    setShareSent(false);
    setShareEmail("");
  }, []);

  return {
    contextMenu,
    setContextMenu,
    shareModal,
    setShareModal,
    shareEmail,
    setShareEmail,
    sharePerm,
    setSharePerm,
    shareExpiry,
    setShareExpiry,
    shareSent,
    setShareSent,
    newFolderModal,
    setNewFolderModal,
    renameModal,
    setRenameModal,
    renameValue,
    setRenameValue,
    deleteConfirm,
    setDeleteConfirm,
    deleteProjectConfirmName,
    setDeleteProjectConfirmName,
    moveModal,
    setMoveModal,
    moveTargetFolder,
    setMoveTargetFolder,
    previewFile,
    setPreviewFile,
    previewUrl,
    setPreviewUrl,
    previewLoading,
    setPreviewLoading,
    previewError,
    setPreviewError,
    closeShareModal,
    openShareModal,
  };
}
