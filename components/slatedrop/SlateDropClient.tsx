"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { buildSlateDropBaseFolderTree, type SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";
import {
  formatBytes, formatDate, getFileIcon, getFileColor,
  findFolder, findFolderPath, withSandboxProjects,
  type SandboxProject, type DbFile, type SlateDropItem,
} from "@/lib/slatedrop/helpers";

import SlateDropTopBar from "./SlateDropTopBar";
import SlateDropSidebar from "./SlateDropSidebar";
import SlateDropToolbar from "./SlateDropToolbar";
import SlateDropFileArea from "./SlateDropFileArea";
import SlateDropContextMenu, { type SlateDropContextMenuState } from "./SlateDropContextMenu";
import SlateDropActionModals from "./SlateDropActionModals";
import SlateDropSharePreviewModals from "./SlateDropSharePreviewModals";
import SlateDropNotificationsOverlay from "./SlateDropNotificationsOverlay";

/* ================================================================
   TYPES
   ================================================================ */

interface SlateDropProps {
  user: { name: string; email: string };
  tier: Tier;
  initialProjectId?: string;
  embedded?: boolean;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  modified: string;
  folderId: string;
  s3Key?: string;
  thumbnail?: string;
  locked?: boolean;
}

type SortKey = "name" | "modified" | "size" | "type";
type SortDir = "asc" | "desc";

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function SlateDropClient({ user, tier, initialProjectId, embedded = false }: SlateDropProps) {
  const ent = getEntitlements(tier);
  const supabase = createClient();

  /* ── Folder tree ── */
  const [folderTree, setFolderTree] = useState<FolderNode[]>(() => buildSlateDropBaseFolderTree(tier));
  const [sandboxProjects, setSandboxProjects] = useState<SandboxProject[]>([]);

  useEffect(() => { setFolderTree(buildSlateDropBaseFolderTree(tier)); }, [tier]);

  const refreshSandboxProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects/sandbox", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const projects = Array.isArray(payload?.projects) ? (payload.projects as SandboxProject[]) : [];
      setSandboxProjects(projects);
      setFolderTree(withSandboxProjects(buildSlateDropBaseFolderTree(tier), projects));
      if (initialProjectId) {
        const match = projects.find((p) => p.id === initialProjectId);
        if (match) {
          setActiveFolderId(match.id);
          setExpandedIds((prev) => new Set([...prev, "projects", match.id]));
        }
      }
    } catch { /* non-blocking */ }
  }, [tier, initialProjectId]);

  useEffect(() => { void refreshSandboxProjects(); }, [refreshSandboxProjects]);

  /* ── Navigation / UI state ── */
  const [activeFolderId, setActiveFolderId] = useState("general");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<SlateDropContextMenuState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  /* ── Modal state ── */
  const [shareModal, setShareModal] = useState<DbFile | null>(null);
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
  const [previewFile, setPreviewFile] = useState<DbFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => { setDeleteProjectConfirmName(""); }, [deleteConfirm?.id, deleteConfirm?.type]);

  /* ── Real file state ── */
  const [realFiles, setRealFiles] = useState<Record<string, FileItem[]>>({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesLoadErrorByFolder, setFilesLoadErrorByFolder] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Toast helper ── */
  const showToast = useCallback((text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const closeShareModal = useCallback(() => { setShareModal(null); setShareSent(false); setShareEmail(""); }, []);
  const openShareModal = useCallback((file: DbFile) => { setShareModal(file); setShareSent(false); setShareEmail(""); }, []);

  const getProjectIdForFolder = useCallback(
    (folderId: string): string | null => {
      const projectIds = new Set(sandboxProjects.map((p) => p.id));
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
    [folderTree, sandboxProjects],
  );

  /* ── File loading ── */
  const refreshFolderFiles = useCallback(async (folderId: string) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(folderId)}`);
      if (!res.ok) { setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: true })); return; }
      const payload = await res.json();
      setRealFiles((prev) => ({ ...prev, [folderId]: Array.isArray(payload?.files) ? payload.files : [] }));
      setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: false }));
    } catch { setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: true })); }
    finally { setLoadingFiles(false); }
  }, []);

  useEffect(() => { void refreshFolderFiles(activeFolderId); }, [activeFolderId, refreshFolderFiles]);

  /* ── Derived ── */
  const activeFolder = useMemo(() => findFolder(folderTree, activeFolderId), [folderTree, activeFolderId]);
  const breadcrumb = useMemo(() => findFolderPath(folderTree, activeFolderId) ?? ["SlateDrop"], [folderTree, activeFolderId]);
  const subFolders = activeFolder?.children ?? [];
  const storageUsed = tier === "trial" ? 1.2 : tier === "creator" ? 12 : tier === "model" ? 42 : 185;

  const currentFiles = useMemo(() => {
    const hasLoaded = Object.prototype.hasOwnProperty.call(realFiles, activeFolderId);
    let files = hasLoaded ? realFiles[activeFolderId] ?? [] : [];
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); files = files.filter((f) => f.name.toLowerCase().includes(q)); }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...files].sort((a, b) => {
      switch (sortKey) {
        case "name": return dir * a.name.localeCompare(b.name);
        case "modified": return dir * a.modified.localeCompare(b.modified);
        case "size": return dir * (a.size - b.size);
        case "type": return dir * a.type.localeCompare(b.type);
        default: return 0;
      }
    });
  }, [activeFolderId, realFiles, searchQuery, sortKey, sortDir]);

  const toDbFile = useCallback((file: FileItem): DbFile => ({
    type: "file", id: file.id, file_name: file.name, s3_key: file.s3Key ?? "", file_type: file.type,
    size: file.size, modified: file.modified, folderId: file.folderId, thumbnail: file.thumbnail, locked: file.locked,
  }), []);

  /* ── Preview URL loading ── */
  useEffect(() => {
    if (!previewFile) { setPreviewUrl(null); setPreviewError(null); setPreviewLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setPreviewLoading(true); setPreviewError(null);
      try {
        const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(previewFile.id)}&mode=preview`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error ?? "Preview unavailable");
        if (!cancelled) setPreviewUrl(data.url);
      } catch (error) { if (!cancelled) { setPreviewUrl(null); setPreviewError(error instanceof Error ? error.message : "Preview unavailable"); } }
      finally { if (!cancelled) setPreviewLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [previewFile]);

  /* ================================================================
     HANDLERS
     ================================================================ */

  const uploadFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const folderPath = breadcrumb.join("/") || activeFolderId;
    for (const file of files) {
      const key = `${file.name}-${Date.now()}`;
      try {
        const urlRes = await fetch("/api/slatedrop/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", size: file.size, folderId: activeFolderId, folderPath }) });
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, fileId, s3Key } = await urlRes.json();
        if (!uploadUrl || !fileId) throw new Error("Upload reservation failed");
        setUploadProgress((prev) => ({ ...prev, [key]: 10 }));
        const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!putRes.ok) throw new Error("S3 upload failed");
        setUploadProgress((prev) => ({ ...prev, [key]: 80 }));
        const completeRes = await fetch("/api/slatedrop/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) });
        if (!completeRes.ok) throw new Error("Upload finalization failed");
        setUploadProgress((prev) => ({ ...prev, [key]: 100 }));
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        setRealFiles((prev) => ({ ...prev, [activeFolderId]: [...(prev[activeFolderId] ?? []), { id: fileId ?? key, name: file.name, size: file.size, type: ext, modified: new Date().toISOString().slice(0, 10), folderId: activeFolderId, s3Key: s3Key ?? undefined }] }));
      } catch (err) { console.error("[SlateDrop] upload error:", err); showToast(`Failed to upload ${file.name}`, false); }
      finally { setTimeout(() => setUploadProgress((prev) => { const next = { ...prev }; delete next[key]; return next; }), 1000); }
    }
    await refreshFolderFiles(activeFolderId);
    showToast(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
  }, [activeFolderId, breadcrumb, showToast, refreshFolderFiles]);

  const toggleExpand = useCallback((id: string) => { setExpandedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }, []);
  const handleSignOut = useCallback(async () => { await supabase.auth.signOut(); window.location.href = "/login"; }, [supabase]);

  const handleDownloadFile = useCallback(async (fileId: string, fileName: string) => {
    try { const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(fileId)}`); const data = await res.json(); if (!res.ok || !data.url) { showToast(data.error ?? `Download failed for ${fileName}`, false); return; } window.open(data.url, "_blank", "noopener,noreferrer"); showToast(`Download started: ${fileName}`); }
    catch { showToast(`Download failed for ${fileName}`, false); }
  }, [showToast]);

  const handleDownloadFolderZip = useCallback(async (folderId: string, folderName: string) => {
    try { const res = await fetch("/api/slatedrop/zip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderId }) }); if (!res.ok) { const err = await res.json().catch(() => ({ error: "ZIP failed" })); showToast(err.error ?? "ZIP failed", false); return; } const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${folderName || "slatedrop-folder"}.zip`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast(`ZIP downloaded: ${folderName}`); }
    catch { showToast(`ZIP failed for ${folderName}`, false); }
  }, [showToast]);

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); showToast(`${label} copied`); } catch { showToast(`Could not copy ${label.toLowerCase()}`, false); }
  }, [showToast]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files); }, [uploadFiles]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);
  const toggleSort = useCallback((key: SortKey) => { if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("asc"); } }, [sortKey]);
  const toggleFileSelect = useCallback((id: string) => { setSelectedFiles((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }, []);

  useEffect(() => { const handler = () => setContextMenu(null); window.addEventListener("click", handler); return () => window.removeEventListener("click", handler); }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, target: SlateDropItem) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, target }); }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  /* ── Modal action handlers ── */

  const handleCreateFolder = useCallback(async (parentId: string, folderName: string) => {
    const projectId = getProjectIdForFolder(parentId);
    if (!projectId) { showToast("Choose a project folder first to create a new folder.", false); return; }
    try {
      const res = await fetch("/api/slatedrop/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, parentFolderId: parentId === projectId ? null : parentId, name: folderName }) });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Create folder failed" })); throw new Error(err.error ?? "Create folder failed"); }
      const data = await res.json().catch(() => ({}));
      await refreshSandboxProjects();
      const createdFolderId = typeof data?.folder?.id === "string" ? data.folder.id : null;
      if (createdFolderId) { setExpandedIds((prev) => { const next = new Set(prev); next.add(projectId); next.add(parentId); return next; }); setActiveFolderId(createdFolderId); }
      showToast(`Folder "${folderName}" created`);
      setNewFolderModal(null);
    } catch (error) { showToast(error instanceof Error ? error.message : "Create folder failed", false); }
  }, [getProjectIdForFolder, refreshSandboxProjects, showToast]);

  const handleRename = useCallback(async (modal: { id: string; name: string; type: "file" | "folder" }, newName: string) => {
    if (modal.type === "file") {
      try { const res = await fetch("/api/slatedrop/rename", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: modal.id, newName }) }); if (!res.ok) { const err = await res.json().catch(() => ({ error: "Rename failed" })); throw new Error(err.error ?? "Rename failed"); } setRealFiles((prev) => ({ ...prev, [activeFolderId]: (prev[activeFolderId] ?? []).map((f) => f.id === modal.id ? { ...f, name: newName } : f) })); await refreshFolderFiles(activeFolderId); showToast(`Renamed to "${newName}"`); }
      catch (error) { showToast(error instanceof Error ? error.message : "Rename failed", false); }
    } else {
      try { const res = await fetch("/api/slatedrop/folders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderId: modal.id, newName }) }); if (!res.ok) { const err = await res.json().catch(() => ({ error: "Rename failed" })); throw new Error(err.error ?? "Rename failed"); } await refreshSandboxProjects(); showToast(`Renamed to "${newName}"`); }
      catch (error) { showToast(error instanceof Error ? error.message : "Rename failed", false); }
    }
    setRenameModal(null);
  }, [activeFolderId, refreshFolderFiles, refreshSandboxProjects, showToast]);

  const handleDeleteConfirm = useCallback(async (target: { id: string; name: string; type: "file" | "folder" | "project" }, projectConfirmName: string) => {
    if (target.type === "file") {
      try { const res = await fetch("/api/slatedrop/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: target.id }) }); if (!res.ok) { const err = await res.json().catch(() => ({ error: "Delete failed" })); throw new Error(err.error ?? "Delete failed"); } setRealFiles((prev) => ({ ...prev, [activeFolderId]: (prev[activeFolderId] ?? []).filter((f) => f.id !== target.id) })); await refreshFolderFiles(activeFolderId); showToast(`"${target.name}" deleted`); }
      catch (error) { showToast(error instanceof Error ? error.message : "Delete failed", false); }
      setDeleteConfirm(null); return;
    }
    if (target.type === "project") {
      if (projectConfirmName.trim() !== target.name) { showToast("Project name does not match.", false); return; }
      if (!sandboxProjects.some((p) => p.id === target.id)) { showToast("Project not found.", false); setDeleteConfirm(null); return; }
      try { const res = await fetch(`/api/projects/${target.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmText: "DELETE", confirmName: projectConfirmName.trim() }) }); if (!res.ok) { const err = await res.json().catch(() => ({ error: "Delete failed" })); throw new Error(err.error ?? "Delete failed"); } const activeProjectId = getProjectIdForFolder(activeFolderId); await refreshSandboxProjects(); if (activeProjectId === target.id) setActiveFolderId("projects"); showToast(`Project "${target.name}" deleted`); }
      catch (error) { showToast(error instanceof Error ? error.message : "Delete failed", false); }
      setDeleteConfirm(null); return;
    }
    // folder
    try { const parentFolderId = findFolder(folderTree, target.id)?.parentId ?? "projects"; const res = await fetch("/api/slatedrop/folders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderId: target.id }) }); if (!res.ok) { const err = await res.json().catch(() => ({ error: "Delete failed" })); throw new Error(err.error ?? "Delete failed"); } setRealFiles((prev) => { const next = { ...prev }; delete next[target.id]; return next; }); await refreshSandboxProjects(); if (activeFolderId === target.id) setActiveFolderId(parentFolderId); showToast(`Folder "${target.name}" deleted`); }
    catch (error) { showToast(error instanceof Error ? error.message : "Delete failed", false); }
    setDeleteConfirm(null);
  }, [activeFolderId, folderTree, getProjectIdForFolder, refreshFolderFiles, refreshSandboxProjects, sandboxProjects, showToast]);

  const handleMoveFile = useCallback(async (fileId: string, targetFolderId: string) => {
    const findPath = (nodes: FolderNode[], id: string, cur = ""): string | null => { for (const n of nodes) { const p = cur ? `${cur}/${n.id}` : n.id; if (n.id === id) return p; const c = findPath(n.children, id, p); if (c) return c; } return null; };
    const fullPath = findPath(folderTree, targetFolderId) || targetFolderId;
    try {
      const res = await fetch("/api/slatedrop/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId, newFolderId: targetFolderId, newS3KeyPrefix: `orgs/default/${fullPath}` }) });
      if (!res.ok) throw new Error("Move failed");
      setRealFiles((prev) => { const next = { ...prev }; if (next[activeFolderId]) { const f = next[activeFolderId].find((x) => x.id === fileId); if (f) { next[activeFolderId] = next[activeFolderId].filter((x) => x.id !== fileId); if (next[targetFolderId]) next[targetFolderId] = [...next[targetFolderId], { ...f, folderId: targetFolderId }]; } } return next; });
      showToast("Moved to folder");
    } catch { showToast("Failed to move file", false); }
    setMoveModal(null);
  }, [activeFolderId, folderTree, showToast]);

  const handleSendSecureLink = useCallback(async () => {
    if (!shareEmail.trim() || !shareModal) return;
    try {
      const res = await fetch("/api/slatedrop/secure-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: shareModal.id, email: shareEmail.trim(), permission: sharePerm === "edit" ? "download" : "view", expiryDays: shareExpiry === "never" ? 365 : parseInt(shareExpiry) }) });
      if (res.ok) { setShareSent(true); setTimeout(() => closeShareModal(), 2000); }
      else { const e = await res.json(); showToast(e.error ?? "Send failed", false); }
    } catch { showToast("Send failed", false); }
  }, [shareEmail, shareModal, sharePerm, shareExpiry, closeShareModal, showToast]);

  /* ── Callback adapters for sub-components ── */
  const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);
  const handleSelectFolder = useCallback((id: string) => { setActiveFolderId(id); setSelectedFiles(new Set()); setMobileSidebarOpen(false); }, []);
  const handleFolderMenuClick = useCallback((node: FolderNode, e: React.MouseEvent<HTMLButtonElement>) => { handleContextMenu(e, { type: "folder", id: node.id, path: node.id, name: node.name, isSystem: node.isSystem }); }, [handleContextMenu]);
  const handleRequestNewFolder = useCallback(() => { const projectId = getProjectIdForFolder(activeFolderId); if (!projectId) { showToast("Choose a project folder first.", false); return; } setNewFolderModal({ parentId: activeFolderId, name: "" }); }, [activeFolderId, getProjectIdForFolder, showToast]);
  const handleCycleSort = useCallback(() => { toggleSort(sortKey === "name" ? "modified" : sortKey === "modified" ? "size" : "name"); }, [sortKey, toggleSort]);
  const handleToolbarZip = useCallback(() => { void handleDownloadFolderZip(activeFolderId, activeFolder?.name ?? "Project Folder"); }, [activeFolderId, activeFolder, handleDownloadFolderZip]);
  const handleFileAreaContextMenu = useCallback((e: React.MouseEvent, file: FileItem) => { handleContextMenu(e, toDbFile(file)); }, [handleContextMenu, toDbFile]);
  const handleFileAreaPreview = useCallback((file: FileItem) => { setPreviewFile(toDbFile(file)); }, [toDbFile]);
  const handleSubFolderContextMenu = useCallback((e: React.MouseEvent, folder: { id: string; name: string; isSystem?: boolean }) => { handleContextMenu(e, { type: "folder", id: folder.id, path: folder.id, name: folder.name, isSystem: folder.isSystem }); }, [handleContextMenu]);
  const handleDeleteProject = useCallback((projectId: string, projectName: string) => { setDeleteConfirm({ id: projectId, name: projectName, type: "project" }); }, []);
  const handleOpenSubFolder = useCallback((folderId: string) => { setActiveFolderId(folderId); setSelectedFiles(new Set()); if (!expandedIds.has(activeFolderId)) toggleExpand(activeFolderId); }, [activeFolderId, expandedIds, toggleExpand]);

  const projectBanner = useMemo(() => {
    const p = sandboxProjects.find((x) => x.id === activeFolderId);
    return p ? { id: p.id, name: p.name, folderCount: p.folders.length } : null;
  }, [activeFolderId, sandboxProjects]);

  /* ================================================================
     RENDER — compose sub-components
     ================================================================ */

  return (
    <div className={embedded ? "h-full flex flex-col bg-[#ECEEF2] overflow-hidden" : "h-screen flex flex-col bg-[#ECEEF2] overflow-hidden"}>
      <SlateDropNotificationsOverlay toastMsg={toastMsg} uploadProgress={uploadProgress} />

      <SlateDropTopBar
        embedded={embedded} user={user} userMenuOpen={userMenuOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        onToggleUserMenu={() => setUserMenuOpen((v) => !v)}
        onCloseUserMenu={() => setUserMenuOpen(false)}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <SlateDropSidebar
          embedded={embedded} mobileSidebarOpen={mobileSidebarOpen} sidebarOpen={sidebarOpen}
          storageUsed={storageUsed} maxStorageGB={ent.maxStorageGB}
          folderTree={folderTree} activeFolderId={activeFolderId} expandedIds={expandedIds}
          onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
          onRequestNewFolder={handleRequestNewFolder}
          onSelectFolder={handleSelectFolder} onToggleFolder={toggleExpand}
          onFolderMenuClick={handleFolderMenuClick}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <SlateDropToolbar
            sidebarOpen={sidebarOpen} breadcrumb={breadcrumb} searchQuery={searchQuery}
            sortKey={sortKey} sortDir={sortDir} viewMode={viewMode}
            showZipButton={activeFolderId.startsWith("proj-") || activeFolderId === "projects"}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onSearchChange={setSearchQuery} onCycleSort={handleCycleSort}
            onSetViewMode={setViewMode} onUploadClick={handleUploadClick}
            onDownloadZip={handleToolbarZip}
          />

          <SlateDropFileArea
            dragOver={dragOver} activeFolderName={activeFolder?.name}
            projectBanner={projectBanner} onDeleteProject={handleDeleteProject}
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            subFolders={subFolders} onOpenSubFolder={handleOpenSubFolder}
            onSubFolderContextMenu={handleSubFolderContextMenu}
            currentFiles={currentFiles} selectedFiles={selectedFiles}
            onToggleFileSelect={toggleFileSelect}
            onFileContextMenu={handleFileAreaContextMenu}
            onPreviewFile={handleFileAreaPreview}
            viewMode={viewMode} sortKey={sortKey} sortDir={sortDir}
            onToggleSort={toggleSort}
            getFileIcon={getFileIcon} getFileColor={getFileColor}
            formatBytes={formatBytes} formatDate={formatDate}
            onUploadClick={handleUploadClick}
          />
        </div>
      </div>

      <SlateDropContextMenu
        contextMenu={contextMenu} activeFolderId={activeFolderId}
        currentFiles={currentFiles} sandboxProjects={sandboxProjects}
        onClose={closeContextMenu}
        onOpenFolder={(id) => setActiveFolderId(id)}
        onOpenProjectHub={(id) => { window.location.href = `/project-hub/${id}`; }}
        onDownloadFile={handleDownloadFile}
        onDownloadFolderZip={handleDownloadFolderZip}
        onRenameFile={(t) => { setRenameModal({ id: t.id, name: t.file_name, type: "file" }); setRenameValue(t.file_name); }}
        onCopyFileName={(n) => copyToClipboard(n, "File name")}
        onMoveFile={(t) => { setMoveModal({ id: t.id, name: t.file_name, type: "file" }); setMoveTargetFolder(activeFolderId); }}
        onOpenShare={openShareModal}
        onDeleteFile={(t) => { setDeleteConfirm({ id: t.id, name: t.file_name, type: "file" }); }}
        onCopyFolderName={(n) => copyToClipboard(n, "Folder name")}
        onRenameFolder={(t) => { setRenameModal({ id: t.id, name: t.name, type: "folder" }); setRenameValue(t.name); }}
        onDeleteFolderOrProject={(t, isProject) => { setDeleteConfirm({ id: t.id, name: t.name, type: isProject ? "project" : "folder" }); }}
        onPreviewFile={(t) => setPreviewFile(t)}
      />

      <SlateDropActionModals
        newFolderModal={newFolderModal} setNewFolderModal={setNewFolderModal} onCreateFolder={handleCreateFolder}
        renameModal={renameModal} setRenameModal={setRenameModal} renameValue={renameValue} setRenameValue={setRenameValue} onRename={handleRename}
        deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} deleteProjectConfirmName={deleteProjectConfirmName} setDeleteProjectConfirmName={setDeleteProjectConfirmName} onDeleteConfirm={handleDeleteConfirm}
        moveModal={moveModal} setMoveModal={setMoveModal} moveTargetFolder={moveTargetFolder} setMoveTargetFolder={setMoveTargetFolder} folderTree={folderTree} activeFolderId={activeFolderId} onMoveFile={handleMoveFile}
      />

      <SlateDropSharePreviewModals
        shareModal={shareModal} shareSent={shareSent} shareEmail={shareEmail} sharePerm={sharePerm} shareExpiry={shareExpiry}
        setShareEmail={setShareEmail} setSharePerm={setSharePerm} setShareExpiry={setShareExpiry}
        closeShareModal={closeShareModal} onSendSecureLink={handleSendSecureLink}
        previewFile={previewFile} previewUrl={previewUrl} previewLoading={previewLoading} previewError={previewError}
        setPreviewFile={setPreviewFile} onDownloadPreviewFile={handleDownloadFile}
        onOpenShareFromPreview={(f) => { openShareModal(f); setPreviewFile(null); }}
        getFileIcon={getFileIcon} getFileColor={getFileColor} formatBytes={formatBytes} formatDate={formatDate}
      />

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
