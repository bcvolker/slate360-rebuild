"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { buildSlateDropBaseFolderTree, type SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";
import {
  findFolder,
  findFolderIdPath,
  findFolderPath,
  flattenFolders,
  formatBytes,
  formatDate,
  getFileColor,
  getFileIcon,
  withSandboxProjects,
  type SandboxProjectTree,
} from "@/lib/slatedrop/client-utils";
import { useSlateDropFiles, type SlateDropFileItem } from "@/lib/hooks/useSlateDropFiles";
import { useSlateDropUiState } from "@/lib/hooks/useSlateDropUiState";
import { useSlateDropTransferActions } from "@/lib/hooks/useSlateDropTransferActions";
import { useSlateDropMutationActions } from "@/lib/hooks/useSlateDropMutationActions";
import { useSlateDropInteractionHandlers } from "@/lib/hooks/useSlateDropInteractionHandlers";
import SlateDropContextMenu from "@/components/slatedrop/SlateDropContextMenu";
import SlateDropActionModals from "@/components/slatedrop/SlateDropActionModals";
import SlateDropSharePreviewModals from "@/components/slatedrop/SlateDropSharePreviewModals";
import SlateDropFileArea from "@/components/slatedrop/SlateDropFileArea";
import SlateDropSidebar from "@/components/slatedrop/SlateDropSidebar";
import SlateDropTopBar from "@/components/slatedrop/SlateDropTopBar";
import SlateDropToolbar from "@/components/slatedrop/SlateDropToolbar";
import SlateDropNotificationsOverlay from "@/components/slatedrop/SlateDropNotificationsOverlay";
import {
  ChevronDown,
  Plus,
  Download,
  File as FileGeneric,
  ArrowRight,
  Activity,
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
  id: SandboxProjectTree["id"];
  name: SandboxProjectTree["name"];
  folders: SandboxProjectTree["folders"];
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
   MAIN COMPONENT
   ================================================================ */

export default function SlateDropClient({ user, tier, initialProjectId, embedded = false }: SlateDropProps) {
  const ent = getEntitlements(tier);
  const supabase = createClient();

  const [folderTree, setFolderTree] = useState<FolderNode[]>(() => buildSlateDropBaseFolderTree(tier));
  const [sandboxProjects, setSandboxProjects] = useState<SandboxProject[]>([]);

  useEffect(() => {
    setFolderTree(buildSlateDropBaseFolderTree(tier));
  }, [tier]);

  const refreshSandboxProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects/sandbox", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;

      const projects = Array.isArray(payload?.projects) ? (payload.projects as SandboxProject[]) : [];
      setSandboxProjects(projects);
      setFolderTree(withSandboxProjects(buildSlateDropBaseFolderTree(tier), projects));

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

  const {
    handleDownloadFile,
    handleDownloadFolderZip,
    copyToClipboard,
    handleSendSecureLink,
  } = useSlateDropTransferActions({
    showToast,
    shareModal,
    shareEmail,
    sharePerm,
    shareExpiry,
    closeShareModal,
    setShareSent,
  });

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

  const {
    handleCreateFolder,
    handleRename,
    handleDeleteConfirmAction,
    handleMoveFile,
  } = useSlateDropMutationActions({
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
  });

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
  const {
    toggleExpand,
    handleContextMenu,
    handleSignOut,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    toggleSort,
    toggleFileSelect,
  } = useSlateDropInteractionHandlers({
    sortKey,
    setExpandedIds,
    openContextMenu: (x, y, target) => {
      setContextMenu({ x, y, target: target as SlateDropItem });
    },
    clearContextMenu: () => setContextMenu(null),
    setDragOver,
    uploadFiles,
    setSortKey,
    setSortDir,
    setSelectedFiles,
    signOutAction: async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    },
  });

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className={embedded ? "h-full flex flex-col bg-[#ECEEF2] overflow-hidden" : "h-screen flex flex-col bg-[#ECEEF2] overflow-hidden"}>
      <SlateDropNotificationsOverlay toastMsg={toastMsg} uploadProgress={uploadProgress} />
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
        onClose={() => setContextMenu(null)}
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
