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
    showToast, shareModal: ui.shareModal, shareEmail: ui.shareEmail,
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
      <div className={embedded ? "h-full flex flex-col bg-zinc-950 overflow-hidden" : "h-screen flex flex-col bg-zinc-950 overflow-hidden"}>
        <SlateDropNotificationsOverlay toastMsg={toastMsg} uploadProgress={uploadProgress} />

        <SlateDropTopBar
          embedded={embedded} user={user} userMenuOpen={userMenuOpen}
          onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
          onToggleUserMenu={() => setUserMenuOpen((v) => !v)}
          onCloseUserMenu={() => setUserMenuOpen(false)}
          onSignOut={interactions.handleSignOut}
        />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-white">Open files from a project</h2>
            <p className="text-sm text-zinc-400">
              Phase 1 SlateDrop is project-scoped. Open a project first to browse and manage files.
            </p>
            <a
              href="/projects"
              className="inline-flex items-center justify-center rounded-xl bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-[#F59E0B]/85 transition-colors"
            >
              Open Projects
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "h-full flex flex-col bg-zinc-950 overflow-hidden" : "h-screen flex flex-col bg-zinc-950 overflow-hidden"}>
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
            onFileContextMenu={handleFileAreaContextMenu}
            onPreviewFile={handleFileAreaPreview}
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
        onDeleteFile={(t) => { ui.setDeleteConfirm({ id: t.id, name: t.file_name, type: "file" }); }}
        onCopyFolderName={(n) => transfers.copyToClipboard(n, "Folder name")}
        onRenameFolder={(t) => { ui.setRenameModal({ id: t.id, name: t.name, type: "folder" }); ui.setRenameValue(t.name); }}
        onDeleteFolderOrProject={(t, isProject) => { ui.setDeleteConfirm({ id: t.id, name: t.name, type: isProject ? "project" : "folder" }); }}
        onPreviewFile={(t) => ui.setPreviewFile(t)}
      />

      <SlateDropActionModals
        newFolderModal={ui.newFolderModal} setNewFolderModal={ui.setNewFolderModal} onCreateFolder={mutations.handleCreateFolder}
        renameModal={ui.renameModal} setRenameModal={ui.setRenameModal} renameValue={ui.renameValue} setRenameValue={ui.setRenameValue} onRename={mutations.handleRename}
        deleteConfirm={ui.deleteConfirm} setDeleteConfirm={ui.setDeleteConfirm} deleteProjectConfirmName={ui.deleteProjectConfirmName} setDeleteProjectConfirmName={ui.setDeleteProjectConfirmName} onDeleteConfirm={mutations.handleDeleteConfirmAction}
        moveModal={ui.moveModal} setMoveModal={ui.setMoveModal} moveTargetFolder={ui.moveTargetFolder} setMoveTargetFolder={ui.setMoveTargetFolder} folderTree={folderTree} activeFolderId={activeFolderId} onMoveFile={mutations.handleMoveFile}
      />

      <SlateDropSharePreviewModals
        shareModal={ui.shareModal} shareSent={ui.shareSent} shareEmail={ui.shareEmail} sharePerm={ui.sharePerm} shareExpiry={ui.shareExpiry}
        setShareEmail={ui.setShareEmail} setSharePerm={ui.setSharePerm} setShareExpiry={ui.setShareExpiry}
        closeShareModal={ui.closeShareModal} onSendSecureLink={transfers.handleSendSecureLink}
        previewFile={ui.previewFile} previewUrl={ui.previewUrl} previewLoading={ui.previewLoading} previewError={ui.previewError}
        setPreviewFile={ui.setPreviewFile} onDownloadPreviewFile={transfers.handleDownloadFile}
        onOpenShareFromPreview={(f) => { ui.openShareModal(f); ui.setPreviewFile(null); }}
        getFileIcon={getFileIcon} getFileColor={getFileColor} formatBytes={formatBytes} formatDate={formatDate}
      />

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
