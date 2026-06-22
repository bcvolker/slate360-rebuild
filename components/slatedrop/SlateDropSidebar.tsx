import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, HardDrive, Lock, MoreHorizontal } from "lucide-react";
import type { SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";
import { SLATEDROP_DRAG_MIME } from "./SlateDropFileArea";

type SlateDropSidebarProps = {
  embedded: boolean;
  mobileSidebarOpen: boolean;
  sidebarOpen: boolean;
  storageUsedGb: number;
  fileCount: number;
  maxStorageGB: number;
  folderTree: FolderNode[];
  activeFolderId: string;
  expandedIds: Set<string>;
  onCloseMobileSidebar: () => void;
  onRequestNewFolder: () => void;
  onSelectFolder: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onFolderMenuClick: (node: FolderNode, event: React.MouseEvent<HTMLButtonElement>) => void;
  onDropFiles: (fileIds: string[], targetFolderId: string) => void;
};

export default function SlateDropSidebar({
  embedded,
  mobileSidebarOpen,
  sidebarOpen,
  storageUsedGb,
  fileCount,
  maxStorageGB,
  folderTree,
  activeFolderId,
  expandedIds,
  onCloseMobileSidebar,
  onRequestNewFolder,
  onSelectFolder,
  onToggleFolder,
  onFolderMenuClick,
  onDropFiles,
}: SlateDropSidebarProps) {
  return (
    <>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={onCloseMobileSidebar}>
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      <aside
        className={`shrink-0 bg-background border-r border-app overflow-y-auto overscroll-contain transition-all duration-200 z-50
          ${mobileSidebarOpen ? `fixed ${embedded ? "top-0" : "top-14"} bottom-0 left-0 w-72 shadow-2xl` : "hidden"}
          md:relative md:flex md:flex-col
          md:h-full
          ${sidebarOpen ? "md:w-64 lg:w-72" : "md:w-0 md:overflow-hidden"}
        `}
      >
        <div className="p-3 pb-10">
          <div className="mb-4 p-3 rounded-xl bg-app-card border border-app">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider flex items-center gap-1">
                <HardDrive size={10} /> Storage
              </span>
              <span className="text-[10px] font-bold text-[var(--graphite-text-body)]">
                {storageUsedGb.toFixed(1)} GB / {maxStorageGB} GB
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((storageUsedGb / maxStorageGB) * 100, 100)}%`,
                  backgroundColor: (storageUsedGb / maxStorageGB) > 0.85 ? "#EF4444" : "var(--graphite-primary)",
                }}
              />
            </div>
            <p className="text-[10px] text-[var(--graphite-muted)] mt-1">
              {(maxStorageGB - storageUsedGb).toFixed(1)} GB available · {fileCount.toLocaleString()} files
            </p>
          </div>

          <button
            onClick={onRequestNewFolder}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-foreground mb-3 transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--graphite-primary)" }}
          >
            <FolderPlus size={13} /> New Folder
          </button>

          <div className="space-y-0.5">
            {folderTree.map((node) => (
              <FolderTreeItem
                key={node.id}
                node={node}
                depth={0}
                activeFolderId={activeFolderId}
                expandedIds={expandedIds}
                onSelect={onSelectFolder}
                onToggle={onToggleFolder}
                onMenuClick={onFolderMenuClick}
                onDropFiles={onDropFiles}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

function FolderTreeItem({
  node,
  depth,
  activeFolderId,
  expandedIds,
  onSelect,
  onToggle,
  onMenuClick,
  onDropFiles,
}: {
  node: FolderNode;
  depth: number;
  activeFolderId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onMenuClick: (node: FolderNode, event: React.MouseEvent<HTMLButtonElement>) => void;
  onDropFiles: (fileIds: string[], targetFolderId: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isActive = activeFolderId === node.id;
  const hasChildren = node.children.length > 0;
  const isProjectNode = node.parentId === "projects";
  const [dragOver, setDragOver] = useState(false);

  return (
    <>
      <div
        className={`relative group/tree-row rounded-lg ${
          dragOver ? "ring-2 ring-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]" : ""
        }`}
        onDragOver={(event) => {
          if (!Array.from(event.dataTransfer.types).includes(SLATEDROP_DRAG_MIME)) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          setDragOver(false);
          const raw = event.dataTransfer.getData(SLATEDROP_DRAG_MIME);
          if (!raw) return;
          event.preventDefault();
          try {
            const ids = JSON.parse(raw) as string[];
            if (Array.isArray(ids) && ids.length > 0) onDropFiles(ids, node.id);
          } catch {
            // malformed payload — ignore
          }
        }}
      >
        <button
          onClick={() => {
            onSelect(node.id);
            if (hasChildren && !isExpanded) onToggle(node.id);
          }}
          className={`w-full flex items-center gap-2 py-2.5 rounded-lg text-left transition-all text-sm group ${
            isActive
              ? "bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)] font-semibold"
              : "text-[var(--graphite-muted)] hover:bg-white/[0.04]"
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: isProjectNode ? "28px" : "12px" }}
        >
          {hasChildren ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggle(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center shrink-0 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]"
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
            <Folder size={14} className="shrink-0 text-[var(--graphite-muted)]" />
          ) : (
            <FolderOpen size={14} className="shrink-0 text-[var(--graphite-muted)]" />
          )}

          <span className="truncate flex-1">{node.name}</span>

          {node.isSystem && (
            <Lock size={9} className="shrink-0 text-[var(--graphite-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {isProjectNode && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onMenuClick(node, event);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/tree-row:opacity-100 transition-opacity text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)] hover:bg-white/[0.04]"
            title="Project options"
          >
            <MoreHorizontal size={11} />
          </button>
        )}
      </div>

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
            onMenuClick={onMenuClick}
            onDropFiles={onDropFiles}
          />
        ))}
    </>
  );
}
