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
    <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-gray-400 hover:bg-gray-100 shrink-0"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
          <FolderOpen size={15} className="text-[#FF4D00] shrink-0" />
          {breadcrumb.map((segment, index) => (
            <span key={index} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && <ChevronRight size={11} className="text-gray-300 shrink-0" />}
              <span
                className={`truncate ${
                  index === breadcrumb.length - 1 ? "font-semibold text-gray-900" : "text-gray-400 hover:text-gray-600 cursor-pointer"
                }`}
              >
                {segment}
              </span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-40 sm:w-48 pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
            />
          </div>

          <button
            onClick={onCycleSort}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            title={`Sort by ${sortKey} (${sortDir})`}
          >
            {sortDir === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
          </button>

          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => onSetViewMode("grid")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-[#FF4D00] text-white" : "text-gray-400 hover:bg-gray-100"}`}
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => onSetViewMode("list")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-[#FF4D00] text-white" : "text-gray-400 hover:bg-gray-100"}`}
            >
              <List size={14} />
            </button>
          </div>

          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#FF4D00" }}
          >
            <Upload size={13} /> Upload
          </button>

          {showZipButton && (
            <button
              onClick={onDownloadZip}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Download project as ZIP"
            >
              <FileArchive size={13} /> ZIP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}