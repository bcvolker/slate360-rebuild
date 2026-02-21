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

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  modified: string;
  folderId: string;
  thumbnail?: string;
  locked?: boolean;
}

type ViewMode = "grid" | "list";
type SortKey = "name" | "modified" | "size" | "type";
type SortDir = "asc" | "desc";

interface ContextMenu {
  x: number;
  y: number;
  target: { type: "file" | "folder"; id: string; name: string; isSystem?: boolean };
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
    children: [
      {
        id: "proj-maple-heights",
        name: "Maple Heights Residence",
        isSystem: false,
        parentId: "projects",
        children: [
          { id: "p1-docs", name: "Documents", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-drawings", name: "Drawings", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-photos", name: "Photos", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-models", name: "3D Models", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-tours", name: "360 Tours", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-rfis", name: "RFIs", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-submittals", name: "Submittals", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-schedule", name: "Schedule", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-budget", name: "Budget", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-reports", name: "Reports", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-safety", name: "Safety", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-correspondence", name: "Correspondence", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-closeout", name: "Closeout", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-daily-logs", name: "Daily Logs", isSystem: true, children: [], parentId: "proj-maple-heights" },
          { id: "p1-misc", name: "Misc", isSystem: false, children: [], parentId: "proj-maple-heights" },
        ],
      },
      {
        id: "proj-harbor-point",
        name: "Harbor Point Office Tower",
        isSystem: false,
        parentId: "projects",
        children: [
          { id: "p2-docs", name: "Documents", isSystem: true, children: [], parentId: "proj-harbor-point" },
          { id: "p2-drawings", name: "Drawings", isSystem: true, children: [], parentId: "proj-harbor-point" },
          { id: "p2-photos", name: "Photos", isSystem: true, children: [], parentId: "proj-harbor-point" },
          { id: "p2-models", name: "3D Models", isSystem: true, children: [], parentId: "proj-harbor-point" },
          { id: "p2-tours", name: "360 Tours", isSystem: true, children: [], parentId: "proj-harbor-point" },
          { id: "p2-rfis", name: "RFIs", isSystem: true, children: [], parentId: "proj-harbor-point" },
          { id: "p2-submittals", name: "Submittals", isSystem: true, children: [], parentId: "proj-harbor-point" },
        ],
      },
    ],
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

  // Add user-created sample folder
  folders.push({
    id: "user-folder-1",
    name: "My Exports",
    isSystem: false,
    children: [],
    parentId: null,
  });

  return folders;
}

const demoFiles: Record<string, FileItem[]> = {
  general: [
    { id: "f1", name: "Welcome to SlateDrop.pdf", size: 245000, type: "pdf", modified: "2026-02-18", folderId: "general" },
    { id: "f2", name: "Getting Started Guide.pdf", size: 1200000, type: "pdf", modified: "2026-02-15", folderId: "general" },
  ],
  "design-studio": [
    { id: "f3", name: "stadium-model.glb", size: 3600000, type: "glb", modified: "2026-02-20", folderId: "design-studio", thumbnail: "/uploads/pletchers.jpg" },
    { id: "f4", name: "floor-plan-v3.dwg", size: 8900000, type: "dwg", modified: "2026-02-19", folderId: "design-studio" },
    { id: "f5", name: "structural-review.pdf", size: 4500000, type: "pdf", modified: "2026-02-17", folderId: "design-studio" },
  ],
  "content-studio": [
    { id: "f6", name: "marketing-brochure.psd", size: 15000000, type: "psd", modified: "2026-02-19", folderId: "content-studio" },
    { id: "f7", name: "client-presentation.pptx", size: 6700000, type: "pptx", modified: "2026-02-18", folderId: "content-studio" },
  ],
  "360-tour-builder": [
    { id: "f8", name: "pletchers-panorama.jpg", size: 18000000, type: "jpg", modified: "2026-02-20", folderId: "360-tour-builder", thumbnail: "/uploads/pletchers.jpg" },
    { id: "f9", name: "lobby-360.jpg", size: 22000000, type: "jpg", modified: "2026-02-19", folderId: "360-tour-builder" },
  ],
  geospatial: [
    { id: "f10", name: "site-survey-lidar.las", size: 95000000, type: "las", modified: "2026-02-16", folderId: "geospatial" },
    { id: "f11", name: "drone-ortho.tif", size: 45000000, type: "tif", modified: "2026-02-15", folderId: "geospatial" },
  ],
  "p1-docs": [
    { id: "f12", name: "Contract-Maple-Heights.pdf", size: 3200000, type: "pdf", modified: "2026-02-10", folderId: "p1-docs" },
    { id: "f13", name: "Insurance-Certificate.pdf", size: 890000, type: "pdf", modified: "2026-02-08", folderId: "p1-docs" },
  ],
  "p1-photos": [
    { id: "f14", name: "site-progress-feb.jpg", size: 4500000, type: "jpg", modified: "2026-02-19", folderId: "p1-photos", thumbnail: "/uploads/pletchers.jpg" },
    { id: "f15", name: "foundation-pour.jpg", size: 5200000, type: "jpg", modified: "2026-02-14", folderId: "p1-photos" },
  ],
  "p1-models": [
    { id: "f16", name: "maple-heights-v2.glb", size: 12000000, type: "glb", modified: "2026-02-18", folderId: "p1-models" },
  ],
  "user-folder-1": [
    { id: "f17", name: "project-archive-jan.zip", size: 250000000, type: "zip", modified: "2026-01-31", folderId: "user-folder-1" },
  ],
};

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

  useEffect(() => {
    setFolderTree(buildFolderTree(tier));
  }, [tier]);

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
  const [shareModal, setShareModal] = useState<{ name: string; id: string } | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePerm, setSharePerm] = useState<"view" | "edit">("view");
  const [shareExpiry, setShareExpiry] = useState("7");
  const [shareSent, setShareSent] = useState(false);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: "file" | "folder" } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "file" | "folder" } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Real file state (loaded from API, keyed by folderId)
  const [realFiles, setRealFiles] = useState<Record<string, FileItem[]>>({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesLoadErrorByFolder, setFilesLoadErrorByFolder] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFolderToTree = useCallback((nodes: FolderNode[], parentId: string, newFolder: FolderNode): FolderNode[] => {
    return nodes.map((node) => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newFolder] };
      }
      if (node.children.length === 0) return node;
      return { ...node, children: addFolderToTree(node.children, parentId, newFolder) };
    });
  }, []);

  const renameFolderInTree = useCallback((nodes: FolderNode[], folderId: string, newName: string): FolderNode[] => {
    return nodes.map((node) => {
      if (node.id === folderId) {
        return { ...node, name: newName };
      }
      if (node.children.length === 0) return node;
      return { ...node, children: renameFolderInTree(node.children, folderId, newName) };
    });
  }, []);

  const collectFolderIds = useCallback((node: FolderNode): string[] => {
    const ids = [node.id];
    for (const child of node.children) {
      ids.push(...collectFolderIds(child));
    }
    return ids;
  }, []);

  const removeFolderFromTree = useCallback((nodes: FolderNode[], folderId: string): FolderNode[] => {
    const next: FolderNode[] = [];
    for (const node of nodes) {
      if (node.id === folderId) continue;
      if (node.children.length > 0) {
        next.push({ ...node, children: removeFolderFromTree(node.children, folderId) });
      } else {
        next.push(node);
      }
    }
    return next;
  }, []);

  /* ── Show toast helper ── */
  const showToast = useCallback((text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

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
    const hasLoadError = filesLoadErrorByFolder[activeFolderId] === true;
    let files = hasLoadedRealFolder
      ? realFiles[activeFolderId] ?? []
      : (hasLoadError ? (demoFiles[activeFolderId] ?? []) : []);
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
        const { uploadUrl, fileId } = await urlRes.json();
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
              onClick={() => setNewFolderModal(true)}
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
                      onContextMenu={(e) => handleContextMenu(e, { type: "folder", id: sf.id, name: sf.name, isSystem: sf.isSystem })}
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
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFileSelect(file.id)}
                      onDoubleClick={() => setPreviewFile(file)}
                      onContextMenu={(e) => handleContextMenu(e, { type: "file", id: file.id, name: file.name })}
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
                              setPreviewFile(file);
                            }}
                            className="w-6 h-6 rounded-md bg-white/90 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#FF4D00] transition-colors"
                          >
                            <Eye size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContextMenu(e, { type: "file", id: file.id, name: file.name });
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
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFileSelect(file.id)}
                      onDoubleClick={() => setPreviewFile(file)}
                      onContextMenu={(e) => handleContextMenu(e, { type: "file", id: file.id, name: file.name })}
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
          {contextMenu.target.type === "file" && (
            <>
              <CtxItem icon={Eye} label="Preview" onClick={() => {
                const f = currentFiles.find((f) => f.id === contextMenu.target.id);
                if (f) setPreviewFile(f);
                closeContextMenu();
              }} />
              <CtxItem icon={Download} label="Download" onClick={() => {
                const file = currentFiles.find((f) => f.id === contextMenu.target.id);
                closeContextMenu();
                if (file) handleDownloadFile(file.id, file.name);
              }} />
              <CtxDivider />
              <CtxItem icon={Edit3} label="Rename" onClick={() => {
                setRenameModal({ id: contextMenu.target.id, name: contextMenu.target.name, type: "file" });
                setRenameValue(contextMenu.target.name);
                closeContextMenu();
              }} />
              <CtxItem icon={Copy} label="Copy" onClick={() => {
                copyToClipboard(contextMenu.target.name, "File name");
                closeContextMenu();
              }} />
              <CtxItem icon={Scissors} label="Move" onClick={() => {
                showToast("Move workflow is not enabled yet", false);
                closeContextMenu();
              }} />
              <CtxDivider />
              <CtxItem
                icon={Send}
                label="Secure Send"
                accent
                onClick={() => {
                  setShareModal({ name: contextMenu.target.name, id: contextMenu.target.id });
                  setShareSent(false);
                  closeContextMenu();
                }}
              />
              <CtxDivider />
              <CtxItem icon={Trash2} label="Delete" danger onClick={() => {
                setDeleteConfirm({ id: contextMenu.target.id, name: contextMenu.target.name, type: "file" });
                closeContextMenu();
              }} />
            </>
          )}
          {contextMenu.target.type === "folder" && (
            <>
              <CtxItem icon={FolderOpen} label="Open" onClick={() => {
                setActiveFolderId(contextMenu.target.id);
                closeContextMenu();
              }} />
              <CtxItem icon={Download} label="Download as ZIP" onClick={() => {
                closeContextMenu();
                handleDownloadFolderZip(contextMenu.target.id, contextMenu.target.name);
              }} />
              <CtxDivider />
              {!contextMenu.target.isSystem && (
                <>
                  <CtxItem icon={Edit3} label="Rename" onClick={() => {
                    setRenameModal({ id: contextMenu.target.id, name: contextMenu.target.name, type: "folder" });
                    setRenameValue(contextMenu.target.name);
                    closeContextMenu();
                  }} />
                  <CtxItem icon={Copy} label="Copy" onClick={() => {
                    copyToClipboard(contextMenu.target.name, "Folder name");
                    closeContextMenu();
                  }} />
                  <CtxItem icon={Scissors} label="Move" onClick={() => {
                    showToast("Folder move is not enabled yet", false);
                    closeContextMenu();
                  }} />
                  <CtxDivider />
                </>
              )}
              <CtxItem
                icon={Send}
                label="Secure Send"
                accent
                onClick={() => {
                  setShareModal({ name: contextMenu.target.name, id: contextMenu.target.id });
                  setShareSent(false);
                  closeContextMenu();
                }}
              />
              {!contextMenu.target.isSystem && (
                <>
                  <CtxDivider />
                  <CtxItem icon={Trash2} label="Delete" danger onClick={() => {
                    setDeleteConfirm({ id: contextMenu.target.id, name: contextMenu.target.name, type: "folder" });
                    closeContextMenu();
                  }} />
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════ MODALS ════════ */}

      {/* Secure Send Modal */}
      {shareModal && (
        <ModalBackdrop onClose={() => setShareModal(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Secure Send</h3>
                <p className="text-xs text-gray-400 mt-0.5">Share &quot;{shareModal.name}&quot;</p>
              </div>
              <button onClick={() => setShareModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
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
                        if (res.ok) setShareSent(true);
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
                      setFolderTree(prev => renameFolderInTree(prev, renameModal.id, renameValue.trim()));
                      showToast(`Folder renamed to "${renameValue.trim()}"`);
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

      {/* New Folder Modal */}
      {newFolderModal && (
        <ModalBackdrop onClose={() => setNewFolderModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">New Folder</h3>
              <button onClick={() => setNewFolderModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="Folder name…"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setNewFolderModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newFolderName.trim()) return;
                    const newId = `user-${Date.now()}`;
                    const newFolder: FolderNode = {
                      id: newId,
                      name: newFolderName.trim(),
                      isSystem: false,
                      parentId: activeFolderId,
                      children: [],
                    };
                    setFolderTree(prev => addFolderToTree(prev, activeFolderId, newFolder));
                    setExpandedIds(prev => {
                      const next = new Set(prev);
                      next.add(activeFolderId);
                      return next;
                    });
                    setRealFiles(prev => ({ ...prev, [newId]: [] }));
                    // Navigate to the new folder
                    setActiveFolderId(newId);
                    setNewFolderModal(false);
                    const createdName = newFolderName.trim();
                    setNewFolderName("");
                    showToast(`Folder "${createdName}" created`);
                  }}
                  disabled={!newFolderName.trim()}
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
                        setRealFiles(prev => ({
                          ...prev,
                          [activeFolderId]: (prev[activeFolderId] ?? []).filter(f => f.id !== deleteConfirm.id),
                        }));
                        await refreshFolderFiles(activeFolderId);
                        showToast(`"${deleteConfirm.name}" deleted`);
                      } catch (error) { showToast(error instanceof Error ? error.message : "Delete failed", false); }
                    } else {
                      const folderNode = findFolder(folderTree, deleteConfirm.id);
                      if (!folderNode) {
                        showToast("Folder not found", false);
                        setDeleteConfirm(null);
                        return;
                      }
                      const idsToDelete = collectFolderIds(folderNode);
                      setFolderTree(prev => removeFolderFromTree(prev, deleteConfirm.id));
                      setRealFiles(prev => {
                        const next = { ...prev };
                        idsToDelete.forEach((id) => { delete next[id]; });
                        return next;
                      });
                      if (idsToDelete.includes(activeFolderId)) {
                        setActiveFolderId(folderNode.parentId ?? "general");
                      }
                      showToast(`"${deleteConfirm.name}" deleted`);
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

      {/* File Preview Modal */}
      {previewFile && (
        <ModalBackdrop onClose={() => setPreviewFile(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const Icon = getFileIcon(previewFile.type);
                  const color = getFileColor(previewFile.type);
                  return <Icon size={18} style={{ color }} />;
                })()}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{previewFile.name}</p>
                  <p className="text-[10px] text-gray-400">{formatBytes(previewFile.size)} · {formatDate(previewFile.modified)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(previewFile.id, previewFile.name)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => {
                    setShareModal({ name: previewFile.name, id: previewFile.id });
                    setShareSent(false);
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
              {previewFile.thumbnail ? (
                <img src={previewFile.thumbnail} alt={previewFile.name} className="max-h-[400px] rounded-lg shadow-md object-contain" />
              ) : (
                <div className="text-center">
                  {(() => {
                    const Icon = getFileIcon(previewFile.type);
                    const color = getFileColor(previewFile.type);
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
