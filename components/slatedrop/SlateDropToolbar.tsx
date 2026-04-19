import { ChevronLeft, ChevronRight, FileArchive, FolderOpen, Grid3X3, List, Search, SortAsc, SortDesc, Upload } from "lucide-react";

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
}: SlateDropToolbarProps) {
  return (
    <div className="shrink-0 bg-zinc-950 border-b border-app px-3 sm:px-4 py-3">
      {/* Row 1: Breadcrumb + upload button */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-zinc-500 hover:bg-white/[0.04] shrink-0"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        <FolderOpen size={15} className="text-[#F59E0B] shrink-0" />
        <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0 overflow-hidden">
          {breadcrumb.map((segment, index) => (
            <span key={index} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && <ChevronRight size={11} className="text-zinc-600 shrink-0" />}
              <span
                className={`truncate ${
                  index === breadcrumb.length - 1 ? "font-semibold text-zinc-100" : "text-zinc-500 hover:text-zinc-300 cursor-pointer"
                }`}
              >
                {segment}
              </span>
            </span>
          ))}
        </div>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-950 transition-all hover:opacity-90 shrink-0"
          style={{ backgroundColor: "#F59E0B" }}
        >
          <Upload size={13} /> <span className="hidden xs:inline">Upload</span>
        </button>
      </div>

      {/* Row 2: Search + controls */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:min-w-0 sm:flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search files…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-app bg-app-card text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all"
          />
        </div>

        <button
          onClick={onCycleSort}
          className="w-9 h-9 rounded-lg border border-app flex items-center justify-center text-zinc-400 hover:bg-white/[0.04] transition-colors shrink-0"
          title={`Sort by ${sortKey} (${sortDir})`}
        >
          {sortDir === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
        </button>

        <div className="flex rounded-lg border border-app overflow-hidden shrink-0">
          <button
            onClick={() => onSetViewMode("grid")}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-[#F59E0B] text-zinc-950" : "text-zinc-400 hover:bg-white/[0.04]"}`}
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={() => onSetViewMode("list")}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-[#F59E0B] text-zinc-950" : "text-zinc-400 hover:bg-white/[0.04]"}`}
          >
            <List size={14} />
          </button>
        </div>

        {showZipButton && (
          <button
            onClick={onDownloadZip}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-app text-zinc-400 hover:bg-white/[0.04] transition-colors shrink-0"
            title="Download project as ZIP"
          >
            <FileArchive size={13} /> ZIP
          </button>
        )}
      </div>
    </div>
  );
}