"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { type SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";
import {
  formatBytes, formatDate, getFileIcon, getFileColor,
  findFolder, findFolderPath,
  type DbFile, type SlateDropItem,
} from "@/lib/slatedrop/helpers";

import { useSlateDropUiState } from "@/lib/hooks/useSlateDropUiState";
import { useSlateDropFiles, type SlateDropFileItem } from "@/lib/hooks/useSlateDropFiles";
import { useSlateDropPreviewUrl } from "@/lib/hooks/useSlateDropPreviewUrl";
import { useSlateDropUploadActions } from "@/lib/hooks/useSlateDropUploadActions";
import { useSlateDropInteractionHandlers } from "@/lib/hooks/useSlateDropInteractionHandlers";
import { useSlateDropTransferActions } from "@/lib/hooks/useSlateDropTransferActions";
import { useSlateDropMutationActions } from "@/lib/hooks/useSlateDropMutationActions";
import { useSlateDropProjectScope } from "@/lib/hooks/useSlateDropProjectScope";

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
  projectName?: string;
  embedded?: boolean;
}

type SortKey = "name" | "modified" | "size" | "type";

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function SlateDropClient({ user, tier, initialProjectId, projectName, embedded = false }: SlateDropProps) {
  const ent = getEntitlements(tier);
  const supabase = createClient();
  const isProjectScoped = Boolean(initialProjectId);

  /* ── Navigation / UI state ── */
  const [viewMode, setViewMode] = useState<"grid" | "list">(embedded ? "list" : "grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    folderTree,
    activeFolderId,
    setActiveFolderId,
    expandedIds,
    setExpandedIds,
    usageSummary,
    refreshFolderTree,
  } = useSlateDropProjectScope(initialProjectId);

  /* ── Toast helper ── */
  const showToast = useCallback((text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  /* ── Sub-hooks ── */
  const ui = useSlateDropUiState();
  const files = useSlateDropFiles({ activeFolderId, searchQuery, sortKey, sortDir });

  useSlateDropPreviewUrl({
    previewFile: ui.previewFile,
    setPreviewUrl: ui.setPreviewUrl,
    setPreviewError: ui.setPreviewError,
    setPreviewLoading: ui.setPreviewLoading,
  });

  /* ── Derived ── */
  const activeFolder = useMemo(() => findFolder(folderTree, activeFolderId), [folderTree, activeFolderId]);
  const breadcrumb = useMemo(() => {
    const folderPath = findFolderPath(folderTree, activeFolderId) ?? [];
    if (isProjectScoped) {
      const rootLabel = projectName ? `${projectName} Files` : "Project Files";
      return folderPath.length > 0 ? [rootLabel, ...folderPath] : [rootLabel];
    }
    return folderPath.length > 0 ? ["SlateDrop", ...folderPath] : ["SlateDrop"];
  }, [activeFolderId, folderTree, isProjectScoped, projectName]);
  const subFolders = activeFolder?.children ?? [];
  const storageUsedGb = usageSummary.storageUsedBytes / (1024 * 1024 * 1024);

  const getProjectIdForFolder = useCallback(
    (_folderId: string): string | null => initialProjectId ?? null,
    [initialProjectId],
  );

  const toDbFile = useCallback((file: SlateDropFileItem): DbFile => ({
    type: "file", id: file.id, file_name: file.name, s3_key: file.s3Key ?? "", file_type: file.type,
    size: file.size, modified: file.modified, folderId: file.folderId, thumbnail: file.thumbnail, locked: file.locked,
  }), []);

  /* ── Action hooks ── */
  const { uploadFiles } = useSlateDropUploadActions({
    activeFolderId, breadcrumb, refreshFolderFiles: files.refreshFolderFiles,
    showToast, setUploadProgress, setRealFiles: files.setRealFiles,
  });

  const interactions = useSlateDropInteractionHandlers({
    sortKey, setExpandedIds,
    openContextMenu: (x, y, target) => ui.setContextMenu({ x, y, target } as SlateDropContextMenuState),
    clearContextMenu: () => ui.setContextMenu(null),
    setDragOver, uploadFiles, setSortKey, setSortDir, setSelectedFiles,
    signOutAction: async () => { await supabase.auth.signOut(); window.location.href = "/login"; },
  });

  const transfers = useSlateDropTransferActions({
    showToast, shareModal: ui.shareModal, shareChannel: ui.shareChannel,
    shareEmail: ui.shareEmail, sharePhone: ui.sharePhone,
    sharePerm: ui.sharePerm, shareExpiry: ui.shareExpiry,
    closeShareModal: ui.closeShareModal, setShareSent: ui.setShareSent,
  });

  const mutations = useSlateDropMutationActions({
    activeFolderId, folderTree,
    moveModal: ui.moveModal, getProjectIdForFolder,
    refreshFolderFiles: files.refreshFolderFiles, refreshFolderTree,
    showToast, setExpandedIds, setActiveFolderId,
    setRealFiles: files.setRealFiles, setNewFolderModal: ui.setNewFolderModal,
    setRenameModal: ui.setRenameModal, setDeleteConfirm: ui.setDeleteConfirm,
    setMoveModal: ui.setMoveModal,
  });

  /* ── Multi-select bulk operations (Explorer/Finder core) ── */
  const clearSelection = useCallback(() => setSelectedFiles(new Set()), []);
  const selectAllFiles = useCallback(() => {
    setSelectedFiles(new Set(files.currentFiles.map((file) => file.id)));
  }, [files.currentFiles]);
  const selectRange = useCallback((fileIds: string[]) => {
    setSelectedFiles((prev) => new Set([...prev, ...fileIds]));
  }, []);
  const bulkDownload = useCallback(() => {
    files.currentFiles
      .filter((file) => selectedFiles.has(file.id))
      .forEach((file) => { void transfers.handleDownloadFile(file.id, file.name); });
  }, [files.currentFiles, selectedFiles, transfers]);
  const bulkDelete = useCallback(async () => {
    const selected = files.currentFiles.filter((file) => selectedFiles.has(file.id));
    if (selected.length === 0) return;
    const plural = selected.length === 1 ? "" : "s";
    if (!window.confirm(`Delete ${selected.length} file${plural}? This cannot be undone.`)) return;
    let ok = 0;
    for (const file of selected) {
      try {
        const res = await fetch("/api/slatedrop/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id }),
        });
        if (res.ok) ok += 1;
      } catch {
        // continue; report the total at the end
      }
    }
    await files.refreshFolderFiles(activeFolderId);
    setSelectedFiles(new Set());
    showToast(`${ok} of ${selected.length} file${plural} deleted`, ok === selected.length);
  }, [files, selectedFiles, activeFolderId, showToast]);
  const bulkMove = useCallback(() => {
    const ids = files.currentFiles.filter((file) => selectedFiles.has(file.id)).map((file) => file.id);
    if (ids.length === 0) return;
    ui.setMoveModal({ id: ids[0], ids, name: `${ids.length} file${ids.length === 1 ? "" : "s"}`, type: "bulk" });
    ui.setMoveTargetFolder(activeFolderId);
  }, [files.currentFiles, selectedFiles, ui, activeFolderId]);

  // "Get upload link": mint a folder upload link (project_external_links) so a
  // client can upload INTO this folder via /upload/<token>, and copy it.
  const handleRequestUploadLink = useCallback(
    async (folderId: string) => {
      const projectId = getProjectIdForFolder(folderId);
      if (!projectId) {
        showToast("Open a project folder first.", false);
        return;
      }
      try {
        const res = await fetch("/api/slatedrop/request-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, folderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          const absolute = `${window.location.origin}${data.url}`;
          await transfers.copyToClipboard(absolute, "Upload link");
        } else {
          showToast(data.error ?? "Could not create upload link", false);
        }
      } catch {
        showToast("Could not create upload link", false);
      }
    },
    [getProjectIdForFolder, transfers, showToast],
  );

  // Drag files (one or the whole selection) into a folder to move them.
  const handleMoveFilesToFolder = useCallback(
    async (fileIds: string[], targetFolderId: string) => {
      const moved = await mutations.moveFilesToFolder(fileIds, targetFolderId);
      if (moved > 0) setSelectedFiles(new Set());
    },
    [mutations],
  );

  // Keyboard: Cmd/Ctrl+A select all, Delete bulk-delete, Escape clear — ignored
  // while typing in an input/textarea so search and modals aren't disrupted.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        if (files.currentFiles.length === 0) return;
        event.preventDefault();
        selectAllFiles();
      } else if (event.key === "Escape" && selectedFiles.size > 0) {
        clearSelection();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedFiles.size > 0) {
        event.preventDefault();
        void bulkDelete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [files.currentFiles.length, selectedFiles, selectAllFiles, clearSelection, bulkDelete]);

  /* ── Callback adapters for sub-components ── */
  const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);
  const handleSelectFolder = useCallback((id: string) => { setActiveFolderId(id); setSelectedFiles(new Set()); setMobileSidebarOpen(false); }, []);
  const handleFolderMenuClick = useCallback((node: FolderNode, e: React.MouseEvent<HTMLButtonElement>) => { interactions.handleContextMenu(e, { type: "folder", id: node.id, path: node.id, name: node.name, isSystem: node.isSystem }); }, [interactions.handleContextMenu]);
  const handleRequestNewFolder = useCallback(() => { const projectId = getProjectIdForFolder(activeFolderId); if (!projectId) { showToast("Choose a project folder first.", false); return; } ui.setNewFolderModal({ parentId: activeFolderId, name: "" }); }, [activeFolderId, getProjectIdForFolder, showToast, ui.setNewFolderModal]);
  const handleCycleSort = useCallback(() => { interactions.toggleSort(sortKey === "name" ? "modified" : sortKey === "modified" ? "size" : "name"); }, [sortKey, interactions.toggleSort]);
  const handleToolbarZip = useCallback(() => { void transfers.handleDownloadFolderZip(activeFolderId, activeFolder?.name ?? "Project Folder"); }, [activeFolderId, activeFolder, transfers.handleDownloadFolderZip]);
  const handleFileAreaContextMenu = useCallback((e: React.MouseEvent, file: SlateDropFileItem) => { interactions.handleContextMenu(e, toDbFile(file)); }, [interactions.handleContextMenu, toDbFile]);
  const handleFileAreaPreview = useCallback((file: SlateDropFileItem) => { ui.setPreviewFile(toDbFile(file)); }, [toDbFile, ui.setPreviewFile]);
  const handleSubFolderContextMenu = useCallback((e: React.MouseEvent, folder: { id: string; name: string; isSystem?: boolean }) => { interactions.handleContextMenu(e, { type: "folder", id: folder.id, path: folder.id, name: folder.name, isSystem: folder.isSystem }); }, [interactions.handleContextMenu]);
  const handleOpenSubFolder = useCallback((folderId: string) => { setActiveFolderId(folderId); setSelectedFiles(new Set()); if (!expandedIds.has(activeFolderId)) interactions.toggleExpand(activeFolderId); }, [activeFolderId, expandedIds, interactions.toggleExpand]);

  const projectBanner = null;

  /* ================================================================
     RENDER — compose sub-components
     ================================================================ */

  if (!isProjectScoped) {
    return (
      <div className={embedded ? "h-full flex flex-col bg-background overflow-hidden" : "h-screen flex flex-col bg-background overflow-hidden"}>
        <SlateDropNotificationsOverlay toastMsg={toastMsg} uploadProgress={uploadProgress} />

        <SlateDropTopBar
          embedded={embedded} user={user} userMenuOpen={userMenuOpen}
          onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
          onToggleUserMenu={() => setUserMenuOpen((v) => !v)}
          onCloseUserMenu={() => setUserMenuOpen(false)}
          onSignOut={interactions.handleSignOut}
        />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-app bg-app-card p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-foreground">Open files from a project</h2>
            <p className="text-sm text-[var(--graphite-muted)]">
              Phase 1 SlateDrop is project-scoped. Open a project first to browse and manage files.
            </p>
            <a
              href="/projects"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)] hover:opacity-90 transition-colors"
            >
              Open Projects
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "h-full flex flex-col bg-background overflow-hidden" : "h-screen flex flex-col bg-background overflow-hidden"}>
      <SlateDropNotificationsOverlay toastMsg={toastMsg} uploadProgress={uploadProgress} />

      <SlateDropTopBar
        embedded={embedded} user={user} userMenuOpen={userMenuOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        onToggleUserMenu={() => setUserMenuOpen((v) => !v)}
        onCloseUserMenu={() => setUserMenuOpen(false)}
        onSignOut={interactions.handleSignOut}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <SlateDropSidebar
          embedded={embedded} mobileSidebarOpen={mobileSidebarOpen} sidebarOpen={sidebarOpen}
          storageUsedGb={storageUsedGb} fileCount={usageSummary.fileCount} maxStorageGB={ent.maxStorageGB}
          folderTree={folderTree} activeFolderId={activeFolderId} expandedIds={expandedIds}
          onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
          onRequestNewFolder={handleRequestNewFolder}
          onSelectFolder={handleSelectFolder} onToggleFolder={interactions.toggleExpand}
          onFolderMenuClick={handleFolderMenuClick}
          onDropFiles={handleMoveFilesToFolder}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <SlateDropToolbar
            sidebarOpen={sidebarOpen} breadcrumb={breadcrumb} searchQuery={searchQuery}
            sortKey={sortKey} sortDir={sortDir} viewMode={viewMode}
            showZipButton={Boolean(activeFolderId)}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onSearchChange={setSearchQuery} onCycleSort={handleCycleSort}
            onSetViewMode={setViewMode} onUploadClick={handleUploadClick}
            onDownloadZip={handleToolbarZip}
          />

          <SlateDropFileArea
            dragOver={dragOver} activeFolderName={activeFolder?.name}
            projectBanner={projectBanner} onDeleteProject={() => {}}
            onDrop={interactions.handleDrop} onDragOver={interactions.handleDragOver} onDragLeave={interactions.handleDragLeave}
            subFolders={subFolders} onOpenSubFolder={handleOpenSubFolder}
            onSubFolderContextMenu={handleSubFolderContextMenu}
            currentFiles={files.currentFiles} selectedFiles={selectedFiles}
            onToggleFileSelect={interactions.toggleFileSelect}
            onSelectRange={selectRange}
            onFileContextMenu={handleFileAreaContextMenu}
            onPreviewFile={handleFileAreaPreview}
            onSelectAll={selectAllFiles}
            onClearSelection={clearSelection}
            onBulkDownload={bulkDownload}
            onBulkMove={bulkMove}
            onBulkDelete={bulkDelete}
            onMoveFilesToFolder={handleMoveFilesToFolder}
            viewMode={viewMode} sortKey={sortKey} sortDir={sortDir}
            onToggleSort={interactions.toggleSort}
            getFileIcon={getFileIcon} getFileColor={getFileColor}
            formatBytes={formatBytes} formatDate={formatDate}
            onUploadClick={handleUploadClick}
          />
        </div>
      </div>

      <SlateDropContextMenu
        contextMenu={ui.contextMenu as SlateDropContextMenuState | null} activeFolderId={activeFolderId}
        currentFiles={files.currentFiles}
        onClose={() => ui.setContextMenu(null)}
        onOpenFolder={(id) => setActiveFolderId(id)}
        onDownloadFile={transfers.handleDownloadFile}
        onDownloadFolderZip={transfers.handleDownloadFolderZip}
        onRenameFile={(t) => { ui.setRenameModal({ id: t.id, name: t.file_name, type: "file" }); ui.setRenameValue(t.file_name); }}
        onCopyFileName={(n) => transfers.copyToClipboard(n, "File name")}
        onMoveFile={(t) => { ui.setMoveModal({ id: t.id, name: t.file_name, type: "file" }); ui.setMoveTargetFolder(activeFolderId); }}
        onOpenShare={ui.openShareModal}
        onCopyShareLink={(t) => { void transfers.handleQuickCopyLink(t.id); }}
        onDeleteFile={(t) => { ui.setDeleteConfirm({ id: t.id, name: t.file_name, type: "file" }); }}
        onCopyFolderName={(n) => transfers.copyToClipboard(n, "Folder name")}
        onRenameFolder={(t) => { ui.setRenameModal({ id: t.id, name: t.name, type: "folder" }); ui.setRenameValue(t.name); }}
        onDeleteFolderOrProject={(t, isProject) => { ui.setDeleteConfirm({ id: t.id, name: t.name, type: isProject ? "project" : "folder" }); }}
        onRequestUploadLink={(t) => { void handleRequestUploadLink(t.id); }}
        onPreviewFile={(t) => ui.setPreviewFile(t)}
      />

      <SlateDropActionModals
        newFolderModal={ui.newFolderModal} setNewFolderModal={ui.setNewFolderModal} onCreateFolder={mutations.handleCreateFolder}
        renameModal={ui.renameModal} setRenameModal={ui.setRenameModal} renameValue={ui.renameValue} setRenameValue={ui.setRenameValue} onRename={mutations.handleRename}
        deleteConfirm={ui.deleteConfirm} setDeleteConfirm={ui.setDeleteConfirm} deleteProjectConfirmName={ui.deleteProjectConfirmName} setDeleteProjectConfirmName={ui.setDeleteProjectConfirmName} onDeleteConfirm={mutations.handleDeleteConfirmAction}
        moveModal={ui.moveModal} setMoveModal={ui.setMoveModal} moveTargetFolder={ui.moveTargetFolder} setMoveTargetFolder={ui.setMoveTargetFolder} folderTree={folderTree} activeFolderId={activeFolderId} onMoveFile={mutations.handleMoveFile} onMoveFiles={handleMoveFilesToFolder}
      />

      <SlateDropSharePreviewModals
        shareModal={ui.shareModal} shareSent={ui.shareSent} shareChannel={ui.shareChannel}
        shareEmail={ui.shareEmail} sharePhone={ui.sharePhone} sharePerm={ui.sharePerm} shareExpiry={ui.shareExpiry}
        setShareChannel={ui.setShareChannel} setShareEmail={ui.setShareEmail} setSharePhone={ui.setSharePhone}
        setSharePerm={ui.setSharePerm} setShareExpiry={ui.setShareExpiry}
        closeShareModal={ui.closeShareModal} onSendSecureLink={transfers.handleSendSecureLink}
        onCopyShareLink={transfers.handleCopyShareLink}
        previewFile={ui.previewFile} previewUrl={ui.previewUrl} previewLoading={ui.previewLoading} previewError={ui.previewError}
        setPreviewFile={ui.setPreviewFile} onDownloadPreviewFile={transfers.handleDownloadFile}
        onOpenShareFromPreview={(f) => { ui.openShareModal(f); ui.setPreviewFile(null); }}
        getFileIcon={getFileIcon} getFileColor={getFileColor} formatBytes={formatBytes} formatDate={formatDate}
      />

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
