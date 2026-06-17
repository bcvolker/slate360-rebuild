import Link from "next/link";
import GlassCard from "@/components/shared/GlassCard";
import {
  Eye,
  Folder,
  FolderOpen,
  Lock,
  MoreHorizontal,
  SortAsc,
  SortDesc,
  Trash2,
  Upload,
} from "lucide-react";
import type { SlateDropFileItem } from "@/lib/hooks/useSlateDropFiles";

type FolderItem = {
  id: string;
  name: string;
  isSystem?: boolean;
};

type ProjectBannerItem = {
  id: string;
  name: string;
  folderCount: number;
} | null;

type ViewMode = "grid" | "list";
type SortKey = "name" | "modified" | "size" | "type";
type SortDir = "asc" | "desc";

type SlateDropFileAreaProps = {
  dragOver: boolean;
  activeFolderName?: string;
  projectBanner: ProjectBannerItem;
  onDeleteProject: (projectId: string, projectName: string) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;

  subFolders: FolderItem[];
  onOpenSubFolder: (folderId: string) => void;
  onSubFolderContextMenu: (event: React.MouseEvent, folder: FolderItem) => void;

  currentFiles: SlateDropFileItem[];
  selectedFiles: Set<string>;
  onToggleFileSelect: (fileId: string) => void;
  onFileContextMenu: (event: React.MouseEvent, file: SlateDropFileItem) => void;
  onPreviewFile: (file: SlateDropFileItem) => void;

  viewMode: ViewMode;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (key: SortKey) => void;

  getFileIcon: (type: string) => React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  getFileColor: (type: string) => string;
  formatBytes: (bytes: number) => string;
  formatDate: (date: string) => string;

  onUploadClick: () => void;
};

export default function SlateDropFileArea({
  dragOver,
  activeFolderName,
  projectBanner,
  onDeleteProject,
  onDrop,
  onDragOver,
  onDragLeave,
  subFolders,
  onOpenSubFolder,
  onSubFolderContextMenu,
  currentFiles,
  selectedFiles,
  onToggleFileSelect,
  onFileContextMenu,
  onPreviewFile,
  viewMode,
  sortKey,
  sortDir,
  onToggleSort,
  getFileIcon,
  getFileColor,
  formatBytes,
  formatDate,
  onUploadClick,
}: SlateDropFileAreaProps) {
  return (
    <div
      className={`flex-1 overflow-y-auto p-4 transition-colors ${
        dragOver ? "bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] ring-2 ring-inset ring-[var(--graphite-primary)] ring-opacity-30" : ""
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="backdrop-blur-sm rounded-2xl border-2 border-dashed border-[var(--graphite-primary)] px-10 py-8 text-center shadow-xl">
            <Upload size={32} className="mx-auto mb-3 text-[var(--graphite-primary)]" />
            <p className="text-sm font-semibold text-[var(--graphite-text-body)]">Drop files here to upload</p>
            <p className="text-xs text-[var(--graphite-muted)] mt-1">Files will be saved to {activeFolderName ?? "this folder"}</p>
          </div>
        </div>
      )}

      {projectBanner && (
        <div className="mb-5 rounded-2xl border border-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] bg-gradient-to-r from-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] to-[color-mix(in_srgb,var(--graphite-primary)_3%,transparent)] p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-0.5">Project Sandbox</p>
            <h3 className="text-base font-black text-[var(--graphite-text-body)]">{projectBanner.name}</h3>
            <p className="text-xs text-[var(--graphite-muted)] mt-0.5">{projectBanner.folderCount} folder{projectBanner.folderCount !== 1 ? "s" : ""} · Upload files or open project details to manage</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/projects/${projectBanner.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--graphite-primary)] text-foreground text-xs font-bold hover:opacity-90 transition-colors"
            >
              Open Project
            </Link>
            <button
              onClick={() => onDeleteProject(projectBanner.id, projectBanner.name)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-800 text-red-400 text-xs font-bold hover:bg-red-950 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}

      {subFolders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-3">Folders</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {subFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onOpenSubFolder(folder.id)}
                onContextMenu={(event) => onSubFolderContextMenu(event, folder)}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-white/10  hover:border-white/10 hover:shadow-sm transition-all text-left group"
              >
                <Folder size={18} className="text-[var(--graphite-muted)] shrink-0" />
                <span className="text-xs font-medium text-[var(--graphite-text-body)] truncate group-hover:text-[var(--graphite-primary)] transition-colors">{folder.name}</span>
                {folder.isSystem && <Lock size={8} className="text-[var(--graphite-muted)] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentFiles.length > 0 && (
        <h3 className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-3">
          Files · {currentFiles.length}
        </h3>
      )}

      {viewMode === "grid" && currentFiles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {currentFiles.map((file) => {
            const Icon = getFileIcon(file.type);
            const color = getFileColor(file.type);
            const isSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                onClick={() => onToggleFileSelect(file.id)}
                onDoubleClick={() => onPreviewFile(file)}
                onContextMenu={(event) => onFileContextMenu(event, file)}
                className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  isSelected ? "border-[var(--graphite-primary)] ring-2 ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)]" : "border-white/10  hover:border-white/10"
                }`}
              >
                <div className="aspect-square flex items-center justify-center bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] relative overflow-hidden">
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

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onPreviewFile(file);
                      }}
                      className="w-6 h-6 rounded-md bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] shadow-sm flex items-center justify-center text-[var(--graphite-muted)] hover:text-[var(--graphite-primary)] transition-colors"
                    >
                      <Eye size={11} />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onFileContextMenu(event, file);
                      }}
                      className="w-6 h-6 rounded-md bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] shadow-sm flex items-center justify-center text-[var(--graphite-muted)] hover:text-[var(--graphite-primary)] transition-colors"
                    >
                      <MoreHorizontal size={11} />
                    </button>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-[var(--graphite-text-body)] truncate leading-tight">{file.name}</p>
                  <p className="text-[10px] text-[var(--graphite-muted)] mt-0.5">{formatBytes(file.size)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "list" && currentFiles.length > 0 && (
        <div className=" rounded-xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-2.5 border-b border-white/10 bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]">
            <button onClick={() => onToggleSort("name")} className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider text-left flex items-center gap-1 hover:text-[var(--graphite-text-body)]">
              Name {sortKey === "name" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <button onClick={() => onToggleSort("size")} className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider text-left flex items-center gap-1 hover:text-[var(--graphite-text-body)] hidden sm:flex">
              Size {sortKey === "size" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <button onClick={() => onToggleSort("modified")} className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider text-left flex items-center gap-1 hover:text-[var(--graphite-text-body)] hidden sm:flex">
              Modified {sortKey === "modified" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <span className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider hidden sm:block">Type</span>
          </div>

          {currentFiles.map((file) => {
            const Icon = getFileIcon(file.type);
            const color = getFileColor(file.type);
            const isSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                onClick={() => onToggleFileSelect(file.id)}
                onDoubleClick={() => onPreviewFile(file)}
                onContextMenu={(event) => onFileContextMenu(event, file)}
                className={`grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-3 border-b border-white/10 cursor-pointer transition-colors group ${
                  isSelected ? "bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)]" : "hover:bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={16} style={{ color }} className="shrink-0" />
                  <span className="text-xs font-medium text-[var(--graphite-text-body)] truncate group-hover:text-[var(--graphite-primary)] transition-colors">{file.name}</span>
                </div>
                <span className="text-xs text-[var(--graphite-muted)] hidden sm:block">{formatBytes(file.size)}</span>
                <span className="text-xs text-[var(--graphite-muted)] hidden sm:block">{formatDate(file.modified)}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block" style={{ color }}>
                  {file.type}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {currentFiles.length === 0 && subFolders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-[var(--graphite-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--graphite-text-body)] mb-1">This folder is empty</p>
          <p className="text-xs text-[var(--graphite-muted)] mb-4 max-w-xs">
            Drag and drop files here, or click the Upload button to add files.
          </p>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-foreground transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--graphite-primary)" }}
          >
            <Upload size={13} /> Upload files
          </button>
        </div>
      )}
    </div>
  );
}
