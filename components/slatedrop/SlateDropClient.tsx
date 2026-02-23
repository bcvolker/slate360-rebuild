"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import {
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Upload,
  Download,
  Trash2,
  Copy,
  Scissors,
  Edit3,
  Eye,
  Send,
  FolderOpen,
  Folder,
  FolderPlus,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  File as FileGeneric,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  X,
  Home,
  HardDrive,
  Lock,
  Share2,
  ArrowRight,
  ArrowUpRight,
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
}

interface FolderNode {
  id: string;
  name: string;
  isSystem: boolean;
  icon?: string;
  children: FolderNode[];
  parentId: string | null;
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

interface ContextMenu {
  x: number;
  y: number;
  target: SlateDropItem;
}

/* ================================================================
   DEMO DATA — tier-aware folder trees
   ================================================================ */

function buildFolderTree(tier: Tier): FolderNode[] {
  const always: FolderNode[] = [
    { id: "general", name: "General", isSystem: true, icon: "📁", children: [], parentId: null },
    { id: "history", name: "History", isSystem: true, icon: "🕒", children: [], parentId: null },
  ];

  const tabFolders: Record<string, FolderNode> = {
    "design-studio": { id: "design-studio", name: "Design Studio", isSystem: true, icon: "🎨", children: [], parentId: null },
    "content-studio": { id: "content-studio", name: "Content Studio", isSystem: true, icon: "📝", children: [], parentId: null },
    "360-tour-builder": { id: "360-tour-builder", name: "360 Tour Builder", isSystem: true, icon: "🔭", children: [], parentId: null },
    "geospatial": { id: "geospatial", name: "Geospatial & Robotics", isSystem: true, icon: "🛰️", children: [], parentId: null },
    "virtual-studio": { id: "virtual-studio", name: "Virtual Studio", isSystem: true, icon: "🎬", children: [], parentId: null },
    "analytics": { id: "analytics", name: "Analytics & Reports", isSystem: true, icon: "📊", children: [], parentId: null },
  };

  const projectsFolder: FolderNode = {
    id: "projects",
    name: "Project Sandbox",
    isSystem: true,
    icon: "🏗️",
    parentId: null,
    children: [],
  };

  let folders: FolderNode[] = [...always];

  switch (tier) {
    case "creator":
      folders.push(tabFolders["content-studio"], tabFolders["360-tour-builder"]);
      break;
    case "model":
      folders.push(
        tabFolders["design-studio"],
        tabFolders["content-studio"],
        tabFolders["360-tour-builder"],
        tabFolders["geospatial"]
      );
      break;
    case "business":
    case "enterprise":
      folders.push(
        tabFolders["design-studio"],
        tabFolders["content-studio"],
        tabFolders["360-tour-builder"],
        tabFolders["geospatial"],
        tabFolders["virtual-studio"],
        tabFolders["analytics"],
        projectsFolder
      );
      break;
    default: // trial — all visible
      folders.push(
        tabFolders["design-studio"],
        tabFolders["content-studio"],
        tabFolders["360-tour-builder"],
        tabFolders["geospatial"],
        tabFolders["virtual-studio"],
        tabFolders["analytics"],
        projectsFolder
      );
      break;
  }

  return folders;
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
   SIDEBAR FOLDER TREE ITEM
   ================================================================ */

function FolderTreeItem({
  node,
  depth,
  activeFolderId,
  expandedIds,
  onSelect,
  onToggle,
}: {
  node: FolderNode;
  depth: number;
  activeFolderId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isActive = activeFolderId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <button
        onClick={() => {
          onSelect(node.id);
          if (hasChildren && !isExpanded) onToggle(node.id);
        }}
        className={`w-full flex items-center gap-2 py-1.5 pr-3 rounded-lg text-left transition-all text-[13px] group ${
          isActive
            ? "bg-[#FF4D00]/10 text-[#FF4D00] font-semibold"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400 hover:text-gray-600"
          >
            <ChevronRight
              size={12}
              className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}

        {node.icon ? (
          <span className="text-sm shrink-0">{node.icon}</span>
        ) : node.isSystem ? (
          <Folder size={14} className="shrink-0 text-[#1E3A8A]" />
        ) : (
          <FolderOpen size={14} className="shrink-0 text-gray-400" />
        )}

        <span className="truncate flex-1">{node.name}</span>

        {node.isSystem && (
          <Lock size={9} className="shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {isExpanded &&
        node.children.map((child) => (
          <FolderTreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            activeFolderId={activeFolderId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function SlateDropClient({ user, tier }: SlateDropProps) {
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
    } catch {
      // non-blocking
    }
  }, [tier]);

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
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Modals
  const [shareModal, setShareModal] = useState<DbFile | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePerm, setSharePerm] = useState<"view" | "edit">("view");
  const [shareExpiry, setShareExpiry] = useState("7");
  const [shareSent, setShareSent] = useState(false);
  const [newFolderModal, setNewFolderModal] = useState<{ parentId: string; name: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: "file" | "folder" } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "file" | "folder" } | null>(null);
  const [moveModal, setMoveModal] = useState<{ id: string; name: string; type: "file" } | null>(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<DbFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Real file state (loaded from API, keyed by folderId)
  const [realFiles, setRealFiles] = useState<Record<string, FileItem[]>>({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesLoadErrorByFolder, setFilesLoadErrorByFolder] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Show toast helper ── */
  const showToast = useCallback((text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const closeShareModal = useCallback(() => {
    setShareModal(null);
    setShareSent(false);
    setShareEmail("");
  }, []);

  const openShareModal = useCallback((file: DbFile) => {
    setShareModal(file);
    setShareSent(false);
    setShareEmail("");
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

  const refreshFolderFiles = useCallback(async (folderId: string) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(folderId)}`);
      if (!res.ok) {
        setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: true }));
        return;
      }
      const payload = await res.json();
      const files = Array.isArray(payload?.files) ? (payload.files as FileItem[]) : [];
      setRealFiles((prev) => ({ ...prev, [folderId]: files }));
      setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: false }));
    } catch {
      setFilesLoadErrorByFolder((prev) => ({ ...prev, [folderId]: true }));
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  /* ── Load real files from API on folder change ── */
  useEffect(() => {
    void refreshFolderFiles(activeFolderId);
  }, [activeFolderId, refreshFolderFiles]);

  /* ── Derived ── */
  const activeFolder = useMemo(() => findFolder(folderTree, activeFolderId), [folderTree, activeFolderId]);
  const breadcrumb = useMemo(() => findFolderPath(folderTree, activeFolderId) ?? ["SlateDrop"], [folderTree, activeFolderId]);

  const currentFiles = useMemo(() => {
    const hasLoadedRealFolder = Object.prototype.hasOwnProperty.call(realFiles, activeFolderId);
    let files = hasLoadedRealFolder ? realFiles[activeFolderId] ?? [] : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      files = files.filter((f) => f.name.toLowerCase().includes(q));
    }
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
  }, [activeFolderId, realFiles, filesLoadErrorByFolder, searchQuery, sortKey, sortDir]);

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
        const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(previewFile.id)}`);
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
    (e: React.MouseEvent, target: ContextMenu["target"]) => {
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
    <div className="h-screen flex flex-col bg-[#F7F8FA] overflow-hidden">
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
      {/* ════════ TOP BAR ════════ */}
      <header className="shrink-0 bg-white border-b border-gray-100 z-30">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <img src="/logo.svg" alt="Slate360" className="h-6 w-auto" />
            </Link>
            <div className="hidden sm:flex items-center text-xs text-gray-400">
              <ChevronRight size={12} />
              <span className="ml-1 font-semibold text-gray-700">SlateDrop</span>
            </div>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebarOpen((v) => !v)}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
            >
              <FolderOpen size={16} />
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Home size={13} /> Dashboard
            </Link>
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-[10px] font-bold"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-10 w-52 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════════ MAIN SPLIT ════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ── MOBILE SIDEBAR OVERLAY ── */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        {/* ── SIDEBAR ── */}
        <aside
          className={`shrink-0 h-full bg-white border-r border-gray-100 overflow-y-auto transition-all duration-200 z-50
            ${mobileSidebarOpen ? "fixed inset-y-14 left-0 w-72 shadow-2xl" : "hidden"}
            md:relative md:flex md:flex-col
            ${sidebarOpen ? "md:w-64 lg:w-72" : "md:w-0 md:overflow-hidden"}
          `}
        >
          <div className="p-3">
            {/* Storage bar */}
            <div className="mb-4 p-3 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <HardDrive size={10} /> Storage
                </span>
                <span className="text-[10px] font-bold text-gray-700">
                  {storageUsed} GB / {ent.maxStorageGB} GB
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((storageUsed / ent.maxStorageGB) * 100, 100)}%`,
                    backgroundColor: (storageUsed / ent.maxStorageGB) > 0.85 ? "#EF4444" : "#FF4D00",
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {(ent.maxStorageGB - storageUsed).toFixed(1)} GB available
              </p>
            </div>

            {/* New folder button */}
            <button
              onClick={() => {
                const projectId = getProjectIdForFolder(activeFolderId);
                if (!projectId) {
                  showToast("Choose a project folder first to create a new folder.", false);
                  return;
                }
                setNewFolderModal({ parentId: activeFolderId, name: "" });
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white mb-3 transition-all hover:opacity-90"
              style={{ backgroundColor: "#FF4D00" }}
            >
              <FolderPlus size={13} /> New Folder
            </button>

            {/* Folder tree */}
            <div className="space-y-0.5">
              {folderTree.map((node) => (
                <FolderTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  activeFolderId={activeFolderId}
                  expandedIds={expandedIds}
                  onSelect={(id) => {
                    setActiveFolderId(id);
                    setSelectedFiles(new Set());
                    setMobileSidebarOpen(false);
                  }}
                  onToggle={toggleExpand}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── TOOLBAR ── */}
          <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-gray-400 hover:bg-gray-100 shrink-0"
                  title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
                <FolderOpen size={15} className="text-[#FF4D00] shrink-0" />
                {breadcrumb.map((seg, i) => (
                  <span key={i} className="flex items-center gap-1.5 min-w-0">
                    {i > 0 && <ChevronRight size={11} className="text-gray-300 shrink-0" />}
                    <span
                      className={`truncate ${
                        i === breadcrumb.length - 1 ? "font-semibold text-gray-900" : "text-gray-400 hover:text-gray-600 cursor-pointer"
                      }`}
                    >
                      {seg}
                    </span>
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-40 sm:w-48 pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                  />
                </div>

                {/* Sort */}
                <button
                  onClick={() => toggleSort(sortKey === "name" ? "modified" : sortKey === "modified" ? "size" : "name")}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                  title={`Sort by ${sortKey} (${sortDir})`}
                >
                  {sortDir === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
                </button>

                {/* View toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-[#FF4D00] text-white" : "text-gray-400 hover:bg-gray-100"}`}
                  >
                    <Grid3X3 size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-[#FF4D00] text-white" : "text-gray-400 hover:bg-gray-100"}`}
                  >
                    <List size={14} />
                  </button>
                </div>

                {/* Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  <Upload size={13} /> Upload
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />

                {/* Download ZIP */}
                {(activeFolderId.startsWith("proj-") || activeFolderId === "projects") && (
                  <button
                    onClick={() => {
                      const folderName = activeFolder?.name ?? "Project Folder";
                      void handleDownloadFolderZip(activeFolderId, folderName);
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Download project as ZIP"
                  >
                    <FileArchive size={13} /> ZIP
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── FILE AREA ── */}
          <div
            className={`flex-1 overflow-y-auto p-4 transition-colors ${
              dragOver ? "bg-[#FF4D00]/5 ring-2 ring-inset ring-[#FF4D00] ring-opacity-30" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {dragOver && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-dashed border-[#FF4D00] px-10 py-8 text-center shadow-xl">
                  <Upload size={32} className="mx-auto mb-3 text-[#FF4D00]" />
                  <p className="text-sm font-semibold text-gray-900">Drop files here to upload</p>
                  <p className="text-xs text-gray-400 mt-1">Files will be saved to {activeFolder?.name ?? "this folder"}</p>
                </div>
              </div>
            )}

            {/* Sub-folders */}
            {subFolders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Folders</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {subFolders.map((sf) => (
                    <button
                      key={sf.id}
                      onClick={() => {
                        setActiveFolderId(sf.id);
                        setSelectedFiles(new Set());
                        if (!expandedIds.has(activeFolderId)) toggleExpand(activeFolderId);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, { type: "folder", id: sf.id, path: sf.id, name: sf.name, isSystem: sf.isSystem })}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all text-left group"
                    >
                      <Folder size={18} className="text-[#1E3A8A] shrink-0" />
                      <span className="text-xs font-medium text-gray-700 truncate group-hover:text-[#FF4D00] transition-colors">{sf.name}</span>
                      {sf.isSystem && <Lock size={8} className="text-gray-300 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Files heading */}
            {currentFiles.length > 0 && (
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Files · {currentFiles.length}
              </h3>
            )}

            {/* Grid view */}
            {viewMode === "grid" && currentFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {currentFiles.map((file) => {
                  const Icon = getFileIcon(file.type);
                  const color = getFileColor(file.type);
                  const isSelected = selectedFiles.has(file.id);
                  const fileItem = toSlateDropItemFromFile(file);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFileSelect(file.id)}
                      onDoubleClick={() => {
                        if (fileItem.type === "file") setPreviewFile(fileItem);
                        else showToast("Preview works for uploaded files only", false);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, fileItem)}
                      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        isSelected ? "border-[#FF4D00] ring-2 ring-[#FF4D00]/20 bg-[#FF4D00]/5" : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      {/* Thumbnail / Icon */}
                      <div className="aspect-square flex items-center justify-center bg-gray-50 relative overflow-hidden">
                        {file.thumbnail ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                            style={{ backgroundImage: `url(${file.thumbnail})` }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Icon size={28} style={{ color }} />
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${color}15`, color }}
                            >
                              {file.type}
                            </span>
                          </div>
                        )}
                        {/* Quick actions overlay */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileItem.type === "file") setPreviewFile(fileItem);
                              else showToast("Preview works for uploaded files only", false);
                            }}
                            className="w-6 h-6 rounded-md bg-white/90 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#FF4D00] transition-colors"
                          >
                            <Eye size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContextMenu(e, fileItem);
                            }}
                            className="w-6 h-6 rounded-md bg-white/90 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#FF4D00] transition-colors"
                          >
                            <MoreHorizontal size={11} />
                          </button>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-[11px] font-semibold text-gray-900 truncate leading-tight">{file.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List view */}
            {viewMode === "list" && currentFiles.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <button onClick={() => toggleSort("name")} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-left flex items-center gap-1 hover:text-gray-600">
                    Name {sortKey === "name" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
                  </button>
                  <button onClick={() => toggleSort("size")} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-left flex items-center gap-1 hover:text-gray-600 hidden sm:flex">
                    Size {sortKey === "size" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
                  </button>
                  <button onClick={() => toggleSort("modified")} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-left flex items-center gap-1 hover:text-gray-600 hidden sm:flex">
                    Modified {sortKey === "modified" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
                  </button>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">Type</span>
                </div>
                {/* Rows */}
                {currentFiles.map((file) => {
                  const Icon = getFileIcon(file.type);
                  const color = getFileColor(file.type);
                  const isSelected = selectedFiles.has(file.id);
                  const fileItem = toSlateDropItemFromFile(file);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFileSelect(file.id)}
                      onDoubleClick={() => {
                        if (fileItem.type === "file") setPreviewFile(fileItem);
                        else showToast("Preview works for uploaded files only", false);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, fileItem)}
                      className={`grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors group ${
                        isSelected ? "bg-[#FF4D00]/5" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon size={16} style={{ color }} className="shrink-0" />
                        <span className="text-xs font-medium text-gray-900 truncate group-hover:text-[#FF4D00] transition-colors">{file.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 hidden sm:block">{formatBytes(file.size)}</span>
                      <span className="text-xs text-gray-400 hidden sm:block">{formatDate(file.modified)}</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider hidden sm:block"
                        style={{ color }}
                      >
                        {file.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {currentFiles.length === 0 && subFolders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <FolderOpen size={28} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">This folder is empty</p>
                <p className="text-xs text-gray-400 mb-4 max-w-xs">
                  Drag and drop files here, or click the Upload button to add files.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  <Upload size={13} /> Upload files
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════ CONTEXT MENU ════════ */}
      {contextMenu && (
        <div
          className="fixed z-[100] w-52 bg-white rounded-xl border border-gray-100 shadow-2xl overflow-hidden py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.target.type === "file" && (() => {
            const target = contextMenu.target;
            return (
              <>
                <CtxItem icon={Eye} label="Preview" onClick={() => {
                  setPreviewFile(target);
                  closeContextMenu();
                }} />
                <CtxItem icon={Download} label="Download" onClick={() => {
                  const file = currentFiles.find((f) => f.id === target.id);
                  closeContextMenu();
                  if (file) handleDownloadFile(file.id, file.name);
                }} />
                <CtxDivider />
                <CtxItem icon={Edit3} label="Rename" onClick={() => {
                  setRenameModal({ id: target.id, name: target.file_name, type: "file" });
                  setRenameValue(target.file_name);
                  closeContextMenu();
                }} />
                <CtxItem icon={Copy} label="Copy" onClick={() => {
                  copyToClipboard(target.file_name, "File name");
                  closeContextMenu();
                }} />
                <CtxItem icon={Scissors} label="Move" onClick={() => {
                  setMoveModal({ id: target.id, name: target.file_name, type: "file" });
                  setMoveTargetFolder(activeFolderId);
                  closeContextMenu();
                }} />
                <CtxDivider />
                <CtxItem
                  icon={Send}
                  label="Secure Send"
                  accent
                  onClick={() => {
                    openShareModal(target);
                    closeContextMenu();
                  }}
                />
                <CtxDivider />
                <CtxItem icon={Trash2} label="Delete" danger onClick={() => {
                  setDeleteConfirm({ id: target.id, name: target.file_name, type: "file" });
                  closeContextMenu();
                }} />
              </>
            );
          })()}
          {contextMenu.target.type === "folder" && (() => {
            const target = contextMenu.target;
            const isProjectNode = sandboxProjects.some((project) => project.id === target.id);
            return (
              <>
                <CtxItem icon={FolderOpen} label="Open" onClick={() => {
                  setActiveFolderId(target.id);
                  closeContextMenu();
                }} />
                <CtxItem icon={Download} label="Download as ZIP" onClick={() => {
                  closeContextMenu();
                  handleDownloadFolderZip(target.id, target.name);
                }} />
                <CtxDivider />
                <CtxItem icon={Copy} label="Copy" onClick={() => {
                  copyToClipboard(target.name, "Folder name");
                  closeContextMenu();
                }} />
                {!target.isSystem && !isProjectNode && (
                  <CtxItem icon={Edit3} label="Rename" onClick={() => {
                    setRenameModal({ id: target.id, name: target.name, type: "folder" });
                    setRenameValue(target.name);
                    closeContextMenu();
                  }} />
                )}
                {!target.isSystem && (
                  <>
                    <CtxDivider />
                    <CtxItem icon={Trash2} label="Delete" danger onClick={() => {
                      setDeleteConfirm({ id: target.id, name: target.name, type: "folder" });
                      closeContextMenu();
                    }} />
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ════════ MODALS ════════ */}

      {/* New Folder Modal */}
      {newFolderModal && (
        <ModalBackdrop onClose={() => setNewFolderModal(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">New Folder</h3>
              <button onClick={() => setNewFolderModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={newFolderModal.name}
                onChange={(e) => setNewFolderModal((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                placeholder="Folder name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setNewFolderModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newFolderModal) return;
                    const folderName = newFolderModal.name.trim();
                    if (!folderName) return;

                    const projectId = getProjectIdForFolder(newFolderModal.parentId);
                    if (!projectId) {
                      showToast("Choose a project folder first to create a new folder.", false);
                      return;
                    }

                    try {
                      const res = await fetch("/api/slatedrop/folders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          projectId,
                          parentFolderId: newFolderModal.parentId === projectId ? null : newFolderModal.parentId,
                          name: folderName,
                        }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({ error: "Create folder failed" }));
                        throw new Error(err.error ?? "Create folder failed");
                      }
                      const data = await res.json().catch(() => ({}));
                      await refreshSandboxProjects();
                      const createdFolderId = typeof data?.folder?.id === "string" ? data.folder.id : null;
                      if (createdFolderId) {
                        setExpandedIds((prev) => {
                          const next = new Set(prev);
                          next.add(projectId);
                          next.add(newFolderModal.parentId);
                          return next;
                        });
                        setActiveFolderId(createdFolderId);
                      }
                      showToast(`Folder \"${folderName}\" created`);
                      setNewFolderModal(null);
                    } catch (error) {
                      showToast(error instanceof Error ? error.message : "Create folder failed", false);
                    }
                  }}
                  disabled={!newFolderModal.name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Secure Send Modal */}
      {shareModal && (
        <ModalBackdrop onClose={closeShareModal}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Secure Send</h3>
                <p className="text-xs text-gray-400 mt-0.5">Share &quot;{shareModal.file_name}&quot;</p>
              </div>
              <button onClick={closeShareModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              {shareSent ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
                  <p className="text-sm font-semibold text-gray-900 mb-1">Link sent!</p>
                  <p className="text-xs text-gray-400">A secure share link was sent to {shareEmail}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recipient email</label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Permission</label>
                    <div className="flex gap-2">
                      {(["view", "edit"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setSharePerm(p)}
                          className={`flex-1 text-xs font-semibold py-2.5 rounded-lg border transition-all capitalize ${
                            sharePerm === p
                              ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]"
                              : "border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {p === "view" ? "View only" : "Can upload"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Link expires</label>
                    <select
                      value={shareExpiry}
                      onChange={(e) => setShareExpiry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all bg-white"
                    >
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      if (!shareEmail.trim() || !shareModal) return;
                      try {
                        const res = await fetch("/api/slatedrop/secure-send", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fileId: shareModal.id,
                            email: shareEmail.trim(),
                            permission: sharePerm === "edit" ? "download" : "view",
                            expiryDays: shareExpiry === "never" ? 365 : parseInt(shareExpiry),
                          }),
                        });
                        if (res.ok) {
                          setShareSent(true);
                          setTimeout(() => {
                            closeShareModal();
                          }, 2000);
                        }
                        else { const e = await res.json(); showToast(e.error ?? "Send failed", false); }
                      } catch { showToast("Send failed", false); }
                    }}
                    disabled={!shareEmail.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#FF4D00" }}
                  >
                    <Send size={14} /> Send secure link
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <ModalBackdrop onClose={() => setRenameModal(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Rename {renameModal.type}</h3>
              <button onClick={() => setRenameModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setRenameModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!renameValue.trim() || !renameModal) return;
                    if (renameModal.type === "file") {
                      try {
                        const res = await fetch("/api/slatedrop/rename", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ fileId: renameModal.id, newName: renameValue.trim() }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({ error: "Rename failed" }));
                          throw new Error(err.error ?? "Rename failed");
                        }
                        setRealFiles(prev => {
                          const fold = prev[activeFolderId] ?? [];
                          return { ...prev, [activeFolderId]: fold.map(f => f.id === renameModal.id ? { ...f, name: renameValue.trim() } : f) };
                        });
                        await refreshFolderFiles(activeFolderId);
                        showToast(`Renamed to "${renameValue.trim()}"`);
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : "Rename failed", false);
                      }
                    } else {
                      try {
                        const res = await fetch("/api/slatedrop/folders", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ folderId: renameModal.id, newName: renameValue.trim() }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({ error: "Rename failed" }));
                          throw new Error(err.error ?? "Rename failed");
                        }
                        await refreshSandboxProjects();
                        showToast(`Renamed to "${renameValue.trim()}"`);
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : "Rename failed", false);
                      }
                    }
                    setRenameModal(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <ModalBackdrop onClose={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Delete {deleteConfirm.type}?</h3>
              <p className="text-xs text-gray-400 mb-6">
                &quot;{deleteConfirm.name}&quot; will be permanently deleted. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!deleteConfirm) return;

                    if (deleteConfirm.type === "file") {
                      try {
                        const res = await fetch("/api/slatedrop/delete", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ fileId: deleteConfirm.id }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({ error: "Delete failed" }));
                          throw new Error(err.error ?? "Delete failed");
                        }
                        setRealFiles((prev) => ({
                          ...prev,
                          [activeFolderId]: (prev[activeFolderId] ?? []).filter((f) => f.id !== deleteConfirm.id),
                        }));
                        await refreshFolderFiles(activeFolderId);
                        showToast(`"${deleteConfirm.name}" deleted`);
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : "Delete failed", false);
                      }
                      setDeleteConfirm(null);
                      return;
                    }

                    const sandboxProject = sandboxProjects.find((project) => project.id === deleteConfirm.id);
                    if (sandboxProject) {
                      try {
                        const res = await fetch(`/api/projects/${deleteConfirm.id}`, {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            confirmText: "DELETE",
                            confirmName: deleteConfirm.name,
                          }),
                        });

                        if (!res.ok) {
                          const err = await res.json().catch(() => ({ error: "Delete failed" }));
                          throw new Error(err.error ?? "Delete failed");
                        }

                        await refreshSandboxProjects();
                        showToast(`Project "${deleteConfirm.name}" deleted`);
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : "Delete failed", false);
                      }

                      setDeleteConfirm(null);
                      return;
                    }

                    try {
                      const parentFolderId = findFolder(folderTree, deleteConfirm.id)?.parentId ?? "projects";
                      const res = await fetch("/api/slatedrop/folders", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ folderId: deleteConfirm.id }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({ error: "Delete failed" }));
                        throw new Error(err.error ?? "Delete failed");
                      }

                      setRealFiles((prev) => {
                        const next = { ...prev };
                        delete next[deleteConfirm.id];
                        return next;
                      });
                      await refreshSandboxProjects();
                      if (activeFolderId === deleteConfirm.id) {
                        setActiveFolderId(parentFolderId);
                      }
                      showToast(`Folder "${deleteConfirm.name}" deleted`);
                    } catch (error) {
                      showToast(error instanceof Error ? error.message : "Delete failed", false);
                    }
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Move Modal */}
      {moveModal && (
        <ModalBackdrop onClose={() => setMoveModal(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Move File</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select destination for "{moveModal.name}"</p>
              </div>
              <button onClick={() => setMoveModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-2 mb-6">
                {/* Simple flat list of folders for now */}
                {(() => {
                  const allFolders: { id: string; name: string; path: string }[] = [];
                  const traverse = (nodes: FolderNode[], path = "") => {
                    nodes.forEach(n => {
                      const currentPath = path ? `${path}/${n.id}` : n.id;
                      allFolders.push({ id: n.id, name: n.name, path: currentPath });
                      traverse(n.children, currentPath);
                    });
                  };
                  traverse(folderTree);
                  return allFolders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setMoveTargetFolder(f.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        moveTargetFolder === f.id ? "bg-[#FF4D00]/10 text-[#FF4D00] font-medium" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Folder size={16} className={moveTargetFolder === f.id ? "text-[#FF4D00]" : "text-gray-400"} />
                      {f.name}
                    </button>
                  ));
                })()}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMoveModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!moveTargetFolder || moveTargetFolder === activeFolderId) {
                      setMoveModal(null);
                      return;
                    }
                    
                    // Find the target folder path
                    let targetPath = moveTargetFolder;
                    const findPath = (nodes: FolderNode[], id: string, currentPath = ""): string | null => {
                      for (const n of nodes) {
                        const p = currentPath ? `${currentPath}/${n.id}` : n.id;
                        if (n.id === id) return p;
                        const childPath = findPath(n.children, id, p);
                        if (childPath) return childPath;
                      }
                      return null;
                    };
                    const fullPath = findPath(folderTree, moveTargetFolder) || moveTargetFolder;

                    try {
                      const res = await fetch("/api/slatedrop/move", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          fileId: moveModal.id,
                          newFolderId: moveTargetFolder,
                          newS3KeyPrefix: `orgs/default/${fullPath}` // Note: orgs/default is a placeholder, the API handles the real org prefix
                        }),
                      });
                      
                      if (!res.ok) throw new Error("Move failed");
                      
                      // Optimistically update UI
                      setRealFiles(prev => {
                        const next = { ...prev };
                        if (next[activeFolderId]) {
                          const fileToMove = next[activeFolderId].find(f => f.id === moveModal.id);
                          if (fileToMove) {
                            next[activeFolderId] = next[activeFolderId].filter(f => f.id !== moveModal.id);
                            if (next[moveTargetFolder]) {
                              next[moveTargetFolder] = [...next[moveTargetFolder], { ...fileToMove, folderId: moveTargetFolder }];
                            }
                          }
                        }
                        return next;
                      });
                      
                      showToast(`Moved to folder`);
                    } catch (err) {
                      showToast("Failed to move file", false);
                    }
                    setMoveModal(null);
                  }}
                  disabled={!moveTargetFolder || moveTargetFolder === activeFolderId}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  Move Here
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <ModalBackdrop onClose={() => setPreviewFile(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const Icon = getFileIcon(previewFile.file_type);
                  const color = getFileColor(previewFile.file_type);
                  return <Icon size={18} style={{ color }} />;
                })()}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{previewFile.file_name}</p>
                  <p className="text-[10px] text-gray-400">{formatBytes(previewFile.size)} · {formatDate(previewFile.modified)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(previewFile.id, previewFile.file_name)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => {
                    openShareModal(previewFile);
                    setPreviewFile(null);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center bg-gray-50 min-h-[300px] p-8">
              {previewLoading ? (
                <div className="text-center">
                  <Loader2 size={32} className="mx-auto mb-3 animate-spin text-[#FF4D00]" />
                  <p className="text-sm text-gray-500 font-medium">Loading preview…</p>
                </div>
              ) : previewError ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 font-medium">Preview not available</p>
                  <p className="text-xs text-gray-400 mt-1">{previewError}</p>
                </div>
              ) : previewUrl && previewFile.file_type.toLowerCase() === "pdf" ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.file_name}
                  className="w-full h-[460px] rounded-lg border border-gray-200 bg-white"
                />
              ) : previewUrl && ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(previewFile.file_type.toLowerCase()) ? (
                <img src={previewUrl} alt={previewFile.file_name} className="max-h-[400px] rounded-lg shadow-md object-contain" />
              ) : (
                <div className="text-center">
                  {(() => {
                    const Icon = getFileIcon(previewFile.file_type);
                    const color = getFileColor(previewFile.file_type);
                    return (
                      <>
                        <Icon size={56} style={{ color }} className="mx-auto mb-4 opacity-50" />
                        <p className="text-sm text-gray-500 font-medium">Preview not available</p>
                        <p className="text-xs text-gray-400 mt-1">Download the file to view it locally</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function CtxItem({
  icon: Icon,
  label,
  onClick,
  danger,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : accent
          ? "text-[#FF4D00] hover:bg-[#FF4D00]/5 font-semibold"
          : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function CtxDivider() {
  return <div className="my-1 mx-3 border-t border-gray-100" />;
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative z-10 w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
