"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Maximize2, Minimize2, Pin, Ruler, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type FolderRow = { id: string; name: string };
type DrawingFile = {
  id: string;
  name: string;
  type?: string;
  modified?: string;
};

type ViewMode = "grid" | "list";

const DRAWING_SETS = ["All Sets", "Architectural", "Structural", "Mechanical", "Electrical", "Plumbing", "Civil", "Landscape", "Fire Protection"] as const;

function isPdf(file: DrawingFile): boolean {
  const ext = String(file.type ?? "").toLowerCase();
  return ext === "pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function guessSet(name: string): string {
  const n = name.toLowerCase();
  if (/^a[\d-]|architect/i.test(n)) return "Architectural";
  if (/^s[\d-]|structur/i.test(n)) return "Structural";
  if (/^m[\d-]|mechanic/i.test(n)) return "Mechanical";
  if (/^e[\d-]|electric/i.test(n)) return "Electrical";
  if (/^p[\d-]|plumb/i.test(n)) return "Plumbing";
  if (/^c[\d-]|civil/i.test(n)) return "Civil";
  if (/^l[\d-]|landscape/i.test(n)) return "Landscape";
  if (/^fp[\d-]|fire/i.test(n)) return "Fire Protection";
  return "Architectural";
}

export default function ProjectDrawingsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<DrawingFile[]>([]);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<DrawingFile | null>(null);

  // Enhanced state
  const [search, setSearch] = useState("");
  const [setFilter, setSetFilter] = useState<string>("All Sets");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Viewer state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const foldersRes = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        const foldersPayload = (await foldersRes.json().catch(() => ({}))) as { folders?: FolderRow[] };
        const folders = Array.isArray(foldersPayload.folders) ? foldersPayload.folders : [];

        const drawingsFolder = folders.find((folder) => folder.name.toLowerCase() === "drawings");
        if (!drawingsFolder) {
          if (!cancelled) { setFiles([]); setUrlMap({}); }
          return;
        }

        const filesRes = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(drawingsFolder.id)}`, { cache: "no-store" });
        const filesPayload = (await filesRes.json().catch(() => ({}))) as { files?: DrawingFile[] };
        const pdfFiles = (Array.isArray(filesPayload.files) ? filesPayload.files : []).filter(isPdf);

        const signedEntries = await Promise.all(
          pdfFiles.map(async (file) => {
            const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}`, { cache: "no-store" });
            const payload = (await res.json().catch(() => ({}))) as { url?: string };
            return [file.id, payload.url ?? ""] as const;
          })
        );

        if (!cancelled) {
          setFiles(pdfFiles);
          setUrlMap(
            signedEntries.reduce<Record<string, string>>((acc, [id, url]) => {
              if (url) acc[id] = url;
              return acc;
            }, {})
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  // Reset viewer state when opening a new file
  useEffect(() => {
    if (activeFile) { setCurrentPage(1); setZoom(100); setTotalPages(pageCounts[activeFile.id] ?? 1); }
  }, [activeFile, pageCounts]);

  const activeUrl = useMemo(() => (activeFile ? urlMap[activeFile.id] : null), [activeFile, urlMap]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    let result = files;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (setFilter !== "All Sets") {
      result = result.filter((f) => guessSet(f.name) === setFilter);
    }
    return result;
  }, [files, search, setFilter]);

  // Stats
  const setCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((f) => { const s = guessSet(f.name); counts[s] = (counts[s] ?? 0) + 1; });
    return counts;
  }, [files]);

  const viewerWidth = useMemo(() => Math.round((isFullscreen ? 1200 : 900) * (zoom / 100)), [zoom, isFullscreen]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  const handleDownload = () => {
    if (!activeFile || !activeUrl) return;
    const a = document.createElement("a");
    a.href = activeUrl;
    a.download = activeFile.name;
    a.target = "_blank";
    a.click();
  };

  // Navigate between files while viewer is open
  const handlePrevFile = () => {
    if (!activeFile) return;
    const idx = filteredFiles.findIndex((f) => f.id === activeFile.id);
    if (idx > 0) setActiveFile(filteredFiles[idx - 1]);
  };
  const handleNextFile = () => {
    if (!activeFile) return;
    const idx = filteredFiles.findIndex((f) => f.id === activeFile.id);
    if (idx < filteredFiles.length - 1) setActiveFile(filteredFiles[idx + 1]);
  };

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid project route.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Drawings</p>
          <h2 className="text-lg font-black text-gray-900">Plans & Drawings Viewer</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{files.length}</span> drawing{files.length !== 1 ? "s" : ""} uploaded
          {Object.keys(setCounts).length > 0 && (
            <span>· {Object.keys(setCounts).length} set{Object.keys(setCounts).length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      {!loading && files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-gray-400">Total</p>
            <p className="text-lg font-black text-gray-900">{files.length}</p>
          </div>
          {Object.entries(setCounts).slice(0, 5).map(([set, count]) => (
            <div key={set} className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-gray-400 truncate">{set}</p>
              <p className="text-lg font-black text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      {!loading && files.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drawings…"
                className="rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 w-56"
              />
            </div>
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-300 focus:outline-none"
            >
              {DRAWING_SETS.map((s) => (
                <option key={s} value={s}>{s}{s !== "All Sets" && setCounts[s] ? ` (${setCounts[s]})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${viewMode === "grid" ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${viewMode === "list" ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              List
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading drawings…
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-600">No drawings uploaded yet</p>
          <p className="mt-1 text-xs text-gray-400">Upload PDF drawings to your project&apos;s &quot;Drawings&quot; folder in SlateDrop</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No drawings match your search or filter.
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFiles.map((file) => {
            const url = urlMap[file.id];
            const set = guessSet(file.name);
            const pages = pageCounts[file.id];
            return (
              <button
                key={file.id}
                onClick={() => setActiveFile(file)}
                className="group overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="relative flex h-[220px] items-center justify-center bg-gray-50">
                  {url ? (
                    <Document
                      file={url}
                      loading={<Loader2 size={16} className="animate-spin text-gray-400" />}
                      onLoadSuccess={({ numPages }) => setPageCounts((prev) => ({ ...prev, [file.id]: numPages }))}
                    >
                      <Page pageNumber={1} width={260} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                  ) : (
                    <p className="text-sm text-gray-400">Preview unavailable</p>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                    <Maximize2 size={20} className="text-white opacity-0 transition group-hover:opacity-80" />
                  </div>
                </div>
                <div className="border-t border-indigo-100 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.modified ?? ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{set}</span>
                      {pages && <span className="text-[10px] text-gray-400">{pages} pg{pages !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Drawing Name</th>
                <th className="px-4 py-2">Set</th>
                <th className="px-4 py-2">Pages</th>
                <th className="px-4 py-2">Modified</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredFiles.map((file) => {
                const set = guessSet(file.name);
                const pages = pageCounts[file.id];
                return (
                  <tr key={file.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setActiveFile(file)}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0 text-indigo-400" />
                        <span className="font-semibold text-gray-800">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{set}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{pages ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-500">{file.modified ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (urlMap[file.id]) { const a = document.createElement("a"); a.href = urlMap[file.id]; a.download = file.name; a.target = "_blank"; a.click(); } }}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Full-Screen Drawing Viewer ─── */}
      {activeFile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          {/* Title bar */}
          <div className="flex items-center justify-between bg-gray-900 px-4 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={handlePrevFile} disabled={filteredFiles.findIndex((f) => f.id === activeFile.id) === 0} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{activeFile.name}</p>
                <p className="text-[10px] text-gray-400">
                  {filteredFiles.findIndex((f) => f.id === activeFile.id) + 1} of {filteredFiles.length} · {guessSet(activeFile.name)}
                </p>
              </div>
              <button onClick={handleNextFile} disabled={filteredFiles.findIndex((f) => f.id === activeFile.id) === filteredFiles.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleDownload} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title="Download"><Download size={16} /></button>
              <button onClick={() => setIsFullscreen((f) => !f)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title="Toggle fullscreen">
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={() => { setActiveFile(null); setIsFullscreen(false); }} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title="Close"><X size={18} /></button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-1.5">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-600">
                <Pin size={12} /> Pin
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-600">
                <Ruler size={12} /> Measure
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button onClick={handlePrevPage} disabled={currentPage <= 1} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button onClick={handleZoomOut} disabled={zoom <= 25} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30">
                <ZoomOut size={16} />
              </button>
              <span className="min-w-[3rem] text-center text-xs font-semibold text-gray-300">{zoom}%</span>
              <button onClick={handleZoomIn} disabled={zoom >= 300} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30">
                <ZoomIn size={16} />
              </button>
              <button onClick={() => setZoom(100)} className="ml-1 rounded-md border border-gray-600 px-2 py-0.5 text-[10px] font-semibold text-gray-400 hover:bg-gray-700">
                Reset
              </button>
            </div>
          </div>

          {/* Drawing Canvas */}
          <div className="flex-1 overflow-auto bg-gray-900 p-4">
            <div className="mx-auto w-fit rounded-lg bg-white p-2 shadow-lg">
              {activeUrl ? (
                <Document
                  file={activeUrl}
                  loading={<div className="flex h-96 items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-400" /></div>}
                  onLoadSuccess={({ numPages }) => { setTotalPages(numPages); setPageCounts((prev) => ({ ...prev, [activeFile.id]: numPages })); }}
                >
                  <Page pageNumber={currentPage} width={viewerWidth} />
                </Document>
              ) : (
                <div className="flex h-96 items-center justify-center">
                  <p className="text-sm text-gray-500">Viewer unavailable for this file.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
