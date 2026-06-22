import { ChevronLeft, ChevronRight, FileArchive, FolderOpen, Grid3X3, List, Search, SortAsc, SortDesc, Trash2, Upload } from "lucide-react";

type SlateDropToolbarProps = {
  sidebarOpen: boolean;
  breadcrumb: string[];
  searchQuery: string;
  sortKey: "name" | "modified" | "size" | "type";
  sortDir: "asc" | "desc";
  viewMode: "grid" | "list";
  showZipButton: boolean;
  onToggleSidebar: () => void;
  onSearchChange: (value: string) => void;
  onCycleSort: () => void;
  onSetViewMode: (viewMode: "grid" | "list") => void;
  onUploadClick: () => void;
  onDownloadZip: () => void;
  /** Optional — when provided, shows a "Trash" button opening recently-deleted. */
  onOpenTrash?: () => void;
};

export default function SlateDropToolbar({
  sidebarOpen,
  breadcrumb,
  searchQuery,
  sortKey,
  sortDir,
  viewMode,
  showZipButton,
  onToggleSidebar,
  onSearchChange,
  onCycleSort,
  onSetViewMode,
  onUploadClick,
  onDownloadZip,
  onOpenTrash,
}: SlateDropToolbarProps) {
  return (
    <div className="shrink-0 bg-background border-b border-app px-3 sm:px-4 py-3">
      {/* Row 1: Breadcrumb + upload button */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.04] shrink-0"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        <FolderOpen size={15} className="text-[var(--graphite-primary)] shrink-0" />
        <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0 overflow-hidden">
          {breadcrumb.map((segment, index) => (
            <span key={index} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && <ChevronRight size={11} className="text-[var(--graphite-muted)] shrink-0" />}
              <span
                className={`truncate ${
                  index === breadcrumb.length - 1 ? "font-semibold text-[var(--graphite-text-body)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)] cursor-pointer"
                }`}
              >
                {segment}
              </span>
            </span>
          ))}
        </div>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--graphite-canvas)] transition-all hover:opacity-90 shrink-0"
          style={{ backgroundColor: "var(--graphite-primary)" }}
        >
          <Upload size={13} /> <span className="hidden xs:inline">Upload</span>
        </button>
      </div>

      {/* Row 2: Search + controls */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:min-w-0 sm:flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--graphite-muted)]" />
          <input
            type="text"
            placeholder="Search files…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-app bg-app-card text-xs text-[var(--graphite-text-body)] placeholder:text-[var(--graphite-muted)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] transition-all"
          />
        </div>

        <button
          onClick={onCycleSort}
          className="w-9 h-9 rounded-lg border border-app flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.04] transition-colors shrink-0"
          title={`Sort by ${sortKey} (${sortDir})`}
        >
          {sortDir === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
        </button>

        <div className="flex rounded-lg border border-app overflow-hidden shrink-0">
          <button
            onClick={() => onSetViewMode("grid")}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "text-[var(--graphite-muted)] hover:bg-white/[0.04]"}`}
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={() => onSetViewMode("list")}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]" : "text-[var(--graphite-muted)] hover:bg-white/[0.04]"}`}
          >
            <List size={14} />
          </button>
        </div>

        {showZipButton && (
          <button
            onClick={onDownloadZip}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-app text-[var(--graphite-muted)] hover:bg-white/[0.04] transition-colors shrink-0"
            title="Download project as ZIP"
          >
            <FileArchive size={13} /> ZIP
          </button>
        )}

        {onOpenTrash && (
          <button
            onClick={onOpenTrash}
            className="w-9 h-9 rounded-lg border border-app flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.04] transition-colors shrink-0"
            title="Recently deleted"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}