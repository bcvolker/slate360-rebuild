import Link from "next/link";
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
        dragOver ? "bg-[#D4AF37]/5 ring-2 ring-inset ring-[#D4AF37] ring-opacity-30" : ""
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900/90 backdrop-blur-sm rounded-2xl border-2 border-dashed border-[#D4AF37] px-10 py-8 text-center shadow-xl">
            <Upload size={32} className="mx-auto mb-3 text-[#D4AF37]" />
            <p className="text-sm font-semibold text-zinc-100">Drop files here to upload</p>
            <p className="text-xs text-zinc-500 mt-1">Files will be saved to {activeFolderName ?? "this folder"}</p>
          </div>
        </div>
      )}

      {projectBanner && (
        <div className="mb-5 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/5 to-[#D4AF37]/3 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">Project Sandbox</p>
            <h3 className="text-base font-black text-zinc-100">{projectBanner.name}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{projectBanner.folderCount} folder{projectBanner.folderCount !== 1 ? "s" : ""} · Upload files or open project details to manage</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/projects/${projectBanner.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37] text-white text-xs font-bold hover:bg-[#E64500] transition-colors"
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
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Folders</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {subFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onOpenSubFolder(folder.id)}
                onContextMenu={(event) => onSubFolderContextMenu(event, folder)}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-sm transition-all text-left group"
              >
                <Folder size={18} className="text-zinc-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-300 truncate group-hover:text-[#D4AF37] transition-colors">{folder.name}</span>
                {folder.isSystem && <Lock size={8} className="text-zinc-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentFiles.length > 0 && (
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
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
                  isSelected ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20 bg-[#D4AF37]/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div className="aspect-square flex items-center justify-center bg-zinc-800/50 relative overflow-hidden">
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
                      className="w-6 h-6 rounded-md bg-zinc-800/90 shadow-sm flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] transition-colors"
                    >
                      <Eye size={11} />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onFileContextMenu(event, file);
                      }}
                      className="w-6 h-6 rounded-md bg-zinc-800/90 shadow-sm flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] transition-colors"
                    >
                      <MoreHorizontal size={11} />
                    </button>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-zinc-100 truncate leading-tight">{file.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{formatBytes(file.size)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "list" && currentFiles.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/50">
            <button onClick={() => onToggleSort("name")} className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-left flex items-center gap-1 hover:text-zinc-300">
              Name {sortKey === "name" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <button onClick={() => onToggleSort("size")} className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-left flex items-center gap-1 hover:text-zinc-300 hidden sm:flex">
              Size {sortKey === "size" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <button onClick={() => onToggleSort("modified")} className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-left flex items-center gap-1 hover:text-zinc-300 hidden sm:flex">
              Modified {sortKey === "modified" && (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
            </button>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:block">Type</span>
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
                className={`grid grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-3 border-b border-zinc-800 cursor-pointer transition-colors group ${
                  isSelected ? "bg-[#D4AF37]/5" : "hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={16} style={{ color }} className="shrink-0" />
                  <span className="text-xs font-medium text-zinc-100 truncate group-hover:text-[#D4AF37] transition-colors">{file.name}</span>
                </div>
                <span className="text-xs text-zinc-500 hidden sm:block">{formatBytes(file.size)}</span>
                <span className="text-xs text-zinc-500 hidden sm:block">{formatDate(file.modified)}</span>
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
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-zinc-600" />
          </div>
          <p className="text-sm font-semibold text-zinc-100 mb-1">This folder is empty</p>
          <p className="text-xs text-zinc-500 mb-4 max-w-xs">
            Drag and drop files here, or click the Upload button to add files.
          </p>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#D4AF37" }}
          >
            <Upload size={13} /> Upload files
          </button>
        </div>
      )}
    </div>
  );
}
