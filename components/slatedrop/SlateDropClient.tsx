"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { buildSlateDropBaseFolderTree, type SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";
import { useSlateDropFiles, type SlateDropFileItem } from "@/lib/hooks/useSlateDropFiles";
import { useSlateDropUiState } from "@/lib/hooks/useSlateDropUiState";
import SlateDropContextMenu from "@/components/slatedrop/SlateDropContextMenu";
import SlateDropActionModals from "@/components/slatedrop/SlateDropActionModals";
import SlateDropSharePreviewModals from "@/components/slatedrop/SlateDropSharePreviewModals";
import SlateDropFileArea from "@/components/slatedrop/SlateDropFileArea";
import SlateDropSidebar from "@/components/slatedrop/SlateDropSidebar";
import SlateDropTopBar from "@/components/slatedrop/SlateDropTopBar";
import SlateDropToolbar from "@/components/slatedrop/SlateDropToolbar";
import {
  ChevronDown,
  Plus,
  Download,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  File as FileGeneric,
  ArrowRight,
  Activity,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface SlateDropProps {
  user: { name: string; email: string };
  tier: Tier;
  /** When provided, auto-navigate to this project's sandbox folder on mount. */
  initialProjectId?: string;
  /**
   * When true, render without the full-screen shell (no h-screen, no top bar).
   * Use this when embedding inside a tab/page that already has a header.
   */
  embedded?: boolean;
}

type SandboxProject = {
  id: string;
  name: string;
  folders: Array<{
    id: string;
    name: string;
    isSystem: boolean;
  }>;
};

type FileItem = SlateDropFileItem;

type DbFile = {
  type: "file";
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

type Folder = {
  type: "folder";
  id: string;
  path: string;
  name: string;
  isSystem?: boolean;
};

type SlateDropItem = DbFile | Folder;

type ViewMode = "grid" | "list";
type SortKey = "name" | "modified" | "size" | "type";
type SortDir = "asc" | "desc";

/* ================================================================
   DEMO DATA — tier-aware folder trees
   ================================================================ */

function buildFolderTree(tier: Tier): FolderNode[] {
  return buildSlateDropBaseFolderTree(tier);
}

/* ================================================================
   HELPERS
   ================================================================ */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFileIcon(type: string): LucideIcon {
  switch (type) {
    case "pdf": case "doc": case "docx": case "txt": return FileText;
    case "jpg": case "jpeg": case "png": case "gif": case "tif": case "psd": return FileImage;
    case "mp4": case "mov": case "avi": return FileVideo;
    case "zip": case "rar": case "7z": return FileArchive;
    default: return File;
  }
}

function getFileColor(type: string): string {
  switch (type) {
    case "pdf": return "#EF4444";
    case "jpg": case "jpeg": case "png": case "gif": case "tif": case "psd": return "#8B5CF6";
    case "glb": case "obj": case "stl": case "dwg": case "fbx": return "#FF4D00";
    case "mp4": case "mov": return "#3B82F6";
    case "zip": case "rar": return "#059669";
    case "las": case "laz": return "#D97706";
    default: return "#6B7280";
  }
}

function flattenFolders(nodes: FolderNode[], path: string[] = []): { node: FolderNode; path: string[] }[] {
  const result: { node: FolderNode; path: string[] }[] = [];
  for (const n of nodes) {
    const p = [...path, n.name];
    result.push({ node: n, path: p });
    if (n.children.length > 0) {
      result.push(...flattenFolders(n.children, p));
    }
  }
  return result;
}

function findFolder(nodes: FolderNode[], id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = findFolder(n.children, id);
    if (c) return c;
  }
  return null;
}

function findFolderPath(nodes: FolderNode[], id: string, path: string[] = []): string[] | null {
  for (const n of nodes) {
    const p = [...path, n.name];
    if (n.id === id) return p;
    const c = findFolderPath(n.children, id, p);
    if (c) return c;
  }
  return null;
}

function withSandboxProjects(nodes: FolderNode[], projects: SandboxProject[]): FolderNode[] {
  return nodes.map((node) => {
    if (node.id !== "projects") {
      if (node.children.length === 0) return node;
      return { ...node, children: withSandboxProjects(node.children, projects) };
    }

    const projectNodes: FolderNode[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      isSystem: false,
      parentId: "projects",
      children: project.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        isSystem: folder.isSystem,
        parentId: project.id,
        children: [],
      })),
    }));

    return { ...node, children: projectNodes };
  });
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function SlateDropClient({ user, tier, initialProjectId, embedded = false }: SlateDropProps) {
  const ent = getEntitlements(tier);
  const supabase = createClient();

  const [folderTree, setFolderTree] = useState<FolderNode[]>(() => buildFolderTree(tier));
  const [sandboxProjects, setSandboxProjects] = useState<SandboxProject[]>([]);

  useEffect(() => {
    setFolderTree(buildFolderTree(tier));
  }, [tier]);

  const refreshSandboxProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects/sandbox", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;

      const projects = Array.isArray(payload?.projects) ? (payload.projects as SandboxProject[]) : [];
      setSandboxProjects(projects);
      setFolderTree(withSandboxProjects(buildFolderTree(tier), projects));

      // If an initialProjectId was provided, auto-select that project's sandbox folder
      if (initialProjectId) {
        const match = projects.find((p) => p.id === initialProjectId);
        if (match) {
          setActiveFolderId(match.id);
          setExpandedIds((prev) => new Set([...prev, "projects", match.id]));
        }
      }
    } catch {
      // non-blocking
    }
  }, [tier, initialProjectId]);

  useEffect(() => {
    void refreshSandboxProjects();
  }, [refreshSandboxProjects]);

  /* ── State ── */
  const [activeFolderId, setActiveFolderId] = useState("general");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const {
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
  } = useSlateDropUiState();

  const {
    realFiles,
    setRealFiles,
    loadingFiles,
    filesLoadErrorByFolder,
    refreshFolderFiles,
    currentFiles,
  } = useSlateDropFiles({
    activeFolderId,
    searchQuery,
    sortKey,
    sortDir,
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Show toast helper ── */
  const showToast = useCallback((text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const getProjectIdForFolder = useCallback(
    (folderId: string): string | null => {
      const projectIds = new Set(sandboxProjects.map((project) => project.id));
      let cursor: string | null = folderId;
      const seen = new Set<string>();

      while (cursor && !seen.has(cursor)) {
        if (projectIds.has(cursor)) return cursor;
        seen.add(cursor);
        const node = findFolder(folderTree, cursor);
        if (!node) break;
        cursor = node.parentId;
      }

      return null;
    },
    [folderTree, sandboxProjects]
  );

  /* ── Derived ── */
  const activeFolder = useMemo(() => findFolder(folderTree, activeFolderId), [folderTree, activeFolderId]);
  const breadcrumb = useMemo(() => findFolderPath(folderTree, activeFolderId) ?? ["SlateDrop"], [folderTree, activeFolderId]);

  const toSlateDropItemFromFile = useCallback((file: FileItem): SlateDropItem => {
    return {
      type: "file",
      id: file.id,
      file_name: file.name,
      s3_key: file.s3Key ?? "",
      file_type: file.type,
      size: file.size,
      modified: file.modified,
      folderId: file.folderId,
      thumbnail: file.thumbnail,
      locked: file.locked,
    };
  }, []);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const fetchPreviewUrl = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(previewFile.id)}&mode=preview`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Preview unavailable");
        }
        if (!cancelled) setPreviewUrl(data.url);
      } catch (error) {
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewError(error instanceof Error ? error.message : "Preview unavailable");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    void fetchPreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [previewFile]);

  const subFolders = activeFolder?.children ?? [];
  const storageUsed = tier === "trial" ? 1.2 : tier === "creator" ? 12 : tier === "model" ? 42 : 185;

  /* ── Upload files helper (shared by drag-drop and file input) ── */
  const uploadFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const folderPath = breadcrumb.join("/") || activeFolderId;

    for (const file of files) {
      const key = `${file.name}-${Date.now()}`;
      try {
        // Step 1: get presigned S3 URL
        const urlRes = await fetch("/api/slatedrop/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            folderId: activeFolderId,
            folderPath,
          }),
        });
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, fileId, s3Key } = await urlRes.json();
        if (!uploadUrl || !fileId) throw new Error("Upload reservation failed");

        // Step 2: PUT to S3
        setUploadProgress(prev => ({ ...prev, [key]: 10 }));
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error("S3 upload failed");
        setUploadProgress(prev => ({ ...prev, [key]: 80 }));

        // Step 3: mark complete
        const completeRes = await fetch("/api/slatedrop/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        });
        if (!completeRes.ok) throw new Error("Upload finalization failed");
        setUploadProgress(prev => ({ ...prev, [key]: 100 }));

        // Step 4: add to local state
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const newFile: FileItem = {
          id: fileId ?? key,
          name: file.name,
          size: file.size,
          type: ext,
          modified: new Date().toISOString().slice(0, 10),
          folderId: activeFolderId,
          s3Key: s3Key ?? undefined,
        };
        setRealFiles(prev => ({
          ...prev,
          [activeFolderId]: [...(prev[activeFolderId] ?? []), newFile],
        }));
      } catch (err) {
        console.error("[SlateDrop] upload error:", err);
        showToast(`Failed to upload ${file.name}`, false);
      } finally {
        setTimeout(() => setUploadProgress(prev => {
          const next = { ...prev }; delete next[key]; return next;
        }), 1000);
      }
    }
    await refreshFolderFiles(activeFolderId);
    showToast(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
  }, [activeFolderId, breadcrumb, showToast, refreshFolderFiles]);

  /* ── Handlers ── */
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, target: SlateDropItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, target });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase]);

  const handleDownloadFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(fileId)}`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        showToast(data.error ?? `Download failed for ${fileName}`, false);
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      showToast(`Download started: ${fileName}`);
    } catch {
      showToast(`Download failed for ${fileName}`, false);
    }
  }, [showToast]);

  const handleDownloadFolderZip = useCallback(async (folderId: string, folderName: string) => {
    try {
      const res = await fetch("/api/slatedrop/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "ZIP failed" }));
        showToast(err.error ?? "ZIP failed", false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${folderName || "slatedrop-folder"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast(`ZIP downloaded: ${folderName}`);
    } catch {
      showToast(`ZIP failed for ${folderName}`, false);
    }
  }, [showToast]);

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`);
    } catch {
      showToast(`Could not copy ${label.toLowerCase()}`, false);
    }
  }, [showToast]);

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
  }, [getProjectIdForFolder, refreshSandboxProjects, setExpandedIds, showToast]);

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
          return { ...prev, [activeFolderId]: folderFiles.map((file) => file.id === renameTarget.id ? { ...file, name: nextName } : file) };
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
  }, [activeFolderId, refreshFolderFiles, refreshSandboxProjects, showToast]);

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
  }, [activeFolderId, folderTree, getProjectIdForFolder, refreshFolderFiles, refreshSandboxProjects, sandboxProjects, showToast]);

  const handleMoveFile = useCallback(async (fileId: string, targetFolderId: string) => {
    if (!moveModal) {
      setMoveModal(null);
      return;
    }

    const findPath = (nodes: FolderNode[], folderId: string, currentPath = ""): string | null => {
      for (const node of nodes) {
        const nextPath = currentPath ? `${currentPath}/${node.id}` : node.id;
        if (node.id === folderId) return nextPath;
        const childPath = findPath(node.children, folderId, nextPath);
        if (childPath) return childPath;
      }
      return null;
    };

    const fullPath = findPath(folderTree, targetFolderId) || targetFolderId;

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
  }, [activeFolderId, folderTree, moveModal, showToast]);

  const handleSendSecureLink = useCallback(async () => {
    if (!shareEmail.trim() || !shareModal) return;
    try {
      const response = await fetch("/api/slatedrop/secure-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: shareModal.id,
          email: shareEmail.trim(),
          permission: sharePerm === "edit" ? "download" : "view",
          expiryDays: shareExpiry === "never" ? 365 : parseInt(shareExpiry),
        }),
      });
      if (response.ok) {
        setShareSent(true);
        setTimeout(() => {
          closeShareModal();
        }, 2000);
      } else {
        const payload = await response.json();
        showToast(payload.error ?? "Send failed", false);
      }
    } catch {
      showToast("Send failed", false);
    }
  }, [closeShareModal, shareEmail, shareExpiry, shareModal, sharePerm, showToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFiles(files);
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  const toggleFileSelect = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Close context menu on any click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className={embedded ? "h-full flex flex-col bg-[#ECEEF2] overflow-hidden" : "h-screen flex flex-col bg-[#ECEEF2] overflow-hidden"}>
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all ${
          toastMsg.ok ? "bg-emerald-600" : "bg-red-500"
        }`}>
          {toastMsg.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toastMsg.text}
        </div>
      )}
      {/* Upload progress indicators */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="fixed bottom-16 right-6 z-[200] space-y-2">
          {Object.entries(uploadProgress).map(([key, pct]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-xl p-3 w-64">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 size={13} className="animate-spin text-[#FF4D00]" />
                <span className="text-xs text-gray-700 truncate">{key.split("-").slice(0, -1).join("-")}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#FF4D00] rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <SlateDropTopBar
        embedded={embedded}
        user={user}
        userMenuOpen={userMenuOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen((value) => !value)}
        onToggleUserMenu={() => setUserMenuOpen((value) => !value)}
        onCloseUserMenu={() => setUserMenuOpen(false)}
        onSignOut={handleSignOut}
      />

      {/* ════════ MAIN SPLIT ════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        <SlateDropSidebar
          embedded={embedded}
          mobileSidebarOpen={mobileSidebarOpen}
          sidebarOpen={sidebarOpen}
          storageUsed={storageUsed}
          maxStorageGB={ent.maxStorageGB}
          folderTree={folderTree}
          activeFolderId={activeFolderId}
          expandedIds={expandedIds}
          onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
          onRequestNewFolder={() => {
            const projectId = getProjectIdForFolder(activeFolderId);
            if (!projectId) {
              showToast("Choose a project folder first to create a new folder.", false);
              return;
            }
            setNewFolderModal({ parentId: activeFolderId, name: "" });
          }}
          onSelectFolder={(id) => {
            setActiveFolderId(id);
            setSelectedFiles(new Set());
            setMobileSidebarOpen(false);
          }}
          onToggleFolder={toggleExpand}
          onFolderMenuClick={(node, event) => {
            handleContextMenu(event, { type: "folder", id: node.id, path: node.id, name: node.name, isSystem: node.isSystem });
          }}
        />

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── TOOLBAR ── */}
          <SlateDropToolbar
            sidebarOpen={sidebarOpen}
            breadcrumb={breadcrumb}
            searchQuery={searchQuery}
            sortKey={sortKey}
            sortDir={sortDir}
            viewMode={viewMode}
            showZipButton={activeFolderId.startsWith("proj-") || activeFolderId === "projects"}
            onToggleSidebar={() => setSidebarOpen((value) => !value)}
            onSearchChange={setSearchQuery}
            onCycleSort={() => toggleSort(sortKey === "name" ? "modified" : sortKey === "modified" ? "size" : "name")}
            onSetViewMode={setViewMode}
            onUploadClick={() => fileInputRef.current?.click()}
            onDownloadZip={() => {
              const folderName = activeFolder?.name ?? "Project Folder";
              void handleDownloadFolderZip(activeFolderId, folderName);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {/* ── FILE AREA ── */}
          <SlateDropFileArea
            dragOver={dragOver}
            activeFolderName={activeFolder?.name}
            projectBanner={(() => {
              const activeProject = sandboxProjects.find((project) => project.id === activeFolderId);
              if (!activeProject) return null;
              return {
                id: activeProject.id,
                name: activeProject.name,
                folderCount: activeProject.folders.length,
              };
            })()}
            onDeleteProject={(projectId, projectName) => {
              setDeleteConfirm({ id: projectId, name: projectName, type: "project" });
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            subFolders={subFolders}
            onOpenSubFolder={(folderId) => {
              setActiveFolderId(folderId);
              setSelectedFiles(new Set());
              if (!expandedIds.has(activeFolderId)) toggleExpand(activeFolderId);
            }}
            onSubFolderContextMenu={(event, folder) => {
              handleContextMenu(event, { type: "folder", id: folder.id, path: folder.id, name: folder.name, isSystem: folder.isSystem });
            }}
            currentFiles={currentFiles}
            selectedFiles={selectedFiles}
            onToggleFileSelect={toggleFileSelect}
            onFileContextMenu={(event, file) => {
              handleContextMenu(event, toSlateDropItemFromFile(file));
            }}
            onPreviewFile={(file) => {
              const item = toSlateDropItemFromFile(file);
              if (item.type === "file") {
                setPreviewFile(item);
              } else {
                showToast("Preview works for uploaded files only", false);
              }
            }}
            viewMode={viewMode}
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            getFileIcon={getFileIcon}
            getFileColor={getFileColor}
            formatBytes={formatBytes}
            formatDate={formatDate}
            onUploadClick={() => fileInputRef.current?.click()}
          />
        </div>
      </div>

      {/* ════════ CONTEXT MENU ════════ */}
      <SlateDropContextMenu
        contextMenu={contextMenu}
        activeFolderId={activeFolderId}
        currentFiles={currentFiles.map((file) => ({ id: file.id, name: file.name }))}
        sandboxProjects={sandboxProjects.map((project) => ({ id: project.id }))}
        onClose={closeContextMenu}
        onOpenFolder={(folderId) => setActiveFolderId(folderId)}
        onOpenProjectHub={(projectId) => { window.location.href = `/project-hub/${projectId}`; }}
        onDownloadFile={handleDownloadFile}
        onDownloadFolderZip={handleDownloadFolderZip}
        onRenameFile={(target) => {
          setRenameModal({ id: target.id, name: target.file_name, type: "file" });
          setRenameValue(target.file_name);
        }}
        onCopyFileName={(fileName) => copyToClipboard(fileName, "File name")}
        onMoveFile={(target, folderId) => {
          setMoveModal({ id: target.id, name: target.file_name, type: "file" });
          setMoveTargetFolder(folderId);
        }}
        onOpenShare={(target) => openShareModal(target)}
        onDeleteFile={(target) => {
          setDeleteConfirm({ id: target.id, name: target.file_name, type: "file" });
        }}
        onCopyFolderName={(folderName) => copyToClipboard(folderName, "Folder name")}
        onRenameFolder={(target) => {
          setRenameModal({ id: target.id, name: target.name, type: "folder" });
          setRenameValue(target.name);
        }}
        onDeleteFolderOrProject={(target, isProjectNode) => {
          setDeleteConfirm({ id: target.id, name: target.name, type: isProjectNode ? "project" : "folder" });
        }}
        onPreviewFile={(target) => setPreviewFile(target)}
      />

      {/* ════════ MODALS ════════ */}
      <SlateDropActionModals
        newFolderModal={newFolderModal}
        setNewFolderModal={setNewFolderModal}
        onCreateFolder={handleCreateFolder}
        renameModal={renameModal}
        setRenameModal={setRenameModal}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        onRename={handleRename}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        deleteProjectConfirmName={deleteProjectConfirmName}
        setDeleteProjectConfirmName={setDeleteProjectConfirmName}
        onDeleteConfirm={handleDeleteConfirmAction}
        moveModal={moveModal}
        setMoveModal={setMoveModal}
        moveTargetFolder={moveTargetFolder}
        setMoveTargetFolder={setMoveTargetFolder}
        folderTree={folderTree}
        activeFolderId={activeFolderId}
        onMoveFile={handleMoveFile}
      />

      <SlateDropSharePreviewModals
        shareModal={shareModal}
        shareSent={shareSent}
        shareEmail={shareEmail}
        sharePerm={sharePerm}
        shareExpiry={shareExpiry}
        setShareEmail={setShareEmail}
        setSharePerm={setSharePerm}
        setShareExpiry={setShareExpiry}
        closeShareModal={closeShareModal}
        onSendSecureLink={handleSendSecureLink}
        previewFile={previewFile}
        previewUrl={previewUrl}
        previewLoading={previewLoading}
        previewError={previewError}
        setPreviewFile={setPreviewFile}
        onDownloadPreviewFile={handleDownloadFile}
        onOpenShareFromPreview={(file) => {
          openShareModal(file);
          setPreviewFile(null);
        }}
        getFileIcon={getFileIcon}
        getFileColor={getFileColor}
        formatBytes={formatBytes}
        formatDate={formatDate}
      />
    </div>
  );
}
