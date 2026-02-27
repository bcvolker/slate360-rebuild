"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, ChevronLeft, ChevronRight, Download, FileImage, Grid3X3, Image, List, Loader2, Search, X, ZoomIn } from "lucide-react";

type FolderRow = { id: string; name: string };
type PhotoFile = {
  id: string;
  name: string;
  type?: string;
  modified?: string;
};

type ViewMode = "grid" | "masonry" | "list";
type SortBy = "name" | "date" | "type";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "svg", "tiff", "tif"];

function isImage(file: PhotoFile): boolean {
  const ext = String(file.type ?? "").toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return true;
  const nameExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.includes(nameExt);
}

function getExtension(file: PhotoFile): string {
  return (file.name.split(".").pop() ?? "").toUpperCase();
}

function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/exterior|outside|facade|elevation/i.test(n)) return "Exterior";
  if (/interior|inside|room|office|lobby/i.test(n)) return "Interior";
  if (/aerial|drone|bird/i.test(n)) return "Aerial";
  if (/progress|update|wip/i.test(n)) return "Progress";
  if (/safety|ppe|hard.?hat/i.test(n)) return "Safety";
  if (/finish|complete|final/i.test(n)) return "Closeout";
  return "General";
}

export default function ProjectPhotosPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [files, setFiles] = useState<PhotoFile[]>([]);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Enhanced state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const foldersRes = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        const foldersPayload = (await foldersRes.json().catch(() => ({}))) as { folders?: FolderRow[] };
        const folders = Array.isArray(foldersPayload.folders) ? foldersPayload.folders : [];

        const photosFolder = folders.find((folder) => folder.name.toLowerCase() === "photos");
        if (!photosFolder) {
          if (!cancelled) { setFiles([]); setUrlMap({}); }
          return;
        }

        const filesRes = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(photosFolder.id)}`, { cache: "no-store" });
        const filesPayload = (await filesRes.json().catch(() => ({}))) as { files?: PhotoFile[] };
        const imageFiles = (Array.isArray(filesPayload.files) ? filesPayload.files : []).filter(isImage);

        const signedEntries = await Promise.all(
          imageFiles.map(async (file) => {
            const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}`, { cache: "no-store" });
            const payload = (await res.json().catch(() => ({}))) as { url?: string };
            return [file.id, payload.url ?? ""] as const;
          })
        );

        if (!cancelled) {
          setFiles(imageFiles);
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

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i !== null && i < filteredFiles.length - 1 ? i + 1 : i));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex]);

  // Filtered & sorted files
  const filteredFiles = useMemo(() => {
    let result = [...files];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (categoryFilter !== "All") {
      result = result.filter((f) => guessCategory(f.name) === categoryFilter);
    }
    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") return (b.modified ?? "").localeCompare(a.modified ?? "");
      if (sortBy === "type") return getExtension(a).localeCompare(getExtension(b));
      return 0;
    });
    return result;
  }, [files, search, categoryFilter, sortBy]);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    files.forEach((f) => cats.add(guessCategory(f.name)));
    return ["All", ...Array.from(cats).sort()];
  }, [files]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((f) => { const c = guessCategory(f.name); counts[c] = (counts[c] ?? 0) + 1; });
    return counts;
  }, [files]);

  // File type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((f) => { const ext = getExtension(f); counts[ext] = (counts[ext] ?? 0) + 1; });
    return counts;
  }, [files]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const onGenerateReport = async () => {
    if (!projectId || generating) return;
    setGenerating(true);
    setToast("Generating photo report…");
    try {
      const res = await fetch(`/api/projects/${projectId}/photo-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; fileName?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to generate photo report");
      setToast(`Photo report generated: ${payload.fileName ?? "PDF created"}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to generate photo report");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadSelected = () => {
    selectedIds.forEach((id) => {
      const url = urlMap[id];
      const file = files.find((f) => f.id === id);
      if (url && file) {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.target = "_blank";
        a.click();
      }
    });
    setToast(`Downloading ${selectedIds.size} photo${selectedIds.size !== 1 ? "s" : ""}…`);
  };

  const lightboxFile = lightboxIndex !== null ? filteredFiles[lightboxIndex] : null;
  const lightboxUrl = lightboxFile ? urlMap[lightboxFile.id] : null;

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Photos</p>
          <h2 className="text-lg font-black text-gray-900">Photo Log</h2>
        </div>
        <button
          onClick={onGenerateReport}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500] disabled:opacity-60"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {generating ? "Generating…" : "Generate Photo Report"}
        </button>
      </div>

      {/* Stats Cards */}
      {!loading && files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-gray-400">Total Photos</p>
            <p className="text-lg font-black text-gray-900">{files.length}</p>
          </div>
          {Object.entries(categoryCounts).slice(0, 3).map(([cat, count]) => (
            <div key={cat} className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-gray-400 truncate">{cat}</p>
              <p className="text-lg font-black text-gray-900">{count}</p>
            </div>
          ))}
          {Object.entries(typeCounts).slice(0, 2).map(([ext, count]) => (
            <div key={ext} className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-gray-400">{ext}</p>
              <p className="text-lg font-black text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search, Filters, View Controls */}
      {!loading && files.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search photos…"
                className="rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 w-52"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-300 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}{c !== "All" && categoryCounts[c] ? ` (${categoryCounts[c]})` : ""}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-300 focus:outline-none"
            >
              <option value="name">Sort: Name</option>
              <option value="date">Sort: Date</option>
              <option value="type">Sort: Type</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-xs font-semibold text-indigo-600">{selectedIds.size} selected</span>
                <button onClick={handleDownloadSelected} className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                  <Download size={12} className="inline mr-1" />Download
                </button>
                <button onClick={clearSelection} className="rounded-md px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100">Clear</button>
              </div>
            )}
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition ${viewMode === "grid" ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
              title="Grid view"
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => setViewMode("masonry")}
              className={`rounded-md p-1.5 transition ${viewMode === "masonry" ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
              title="Masonry view"
            >
              <Image size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition ${viewMode === "list" ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
              title="List view"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {!loading && files.length > 0 && selectedIds.size === 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button onClick={selectAll} className="text-indigo-600 hover:underline">Select all ({filteredFiles.length})</button>
          <span>· Showing {filteredFiles.length} of {files.length}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading photos…
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Camera size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-600">No photos uploaded yet</p>
          <p className="mt-1 text-xs text-gray-400">Upload images to your project&apos;s &quot;Photos&quot; folder in SlateDrop</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No photos match your search or filter.
        </div>
      ) : viewMode === "grid" ? (
        /* Uniform Grid View */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredFiles.map((file, idx) => {
            const url = urlMap[file.id];
            const selected = selectedIds.has(file.id);
            const category = guessCategory(file.name);
            return (
              <div key={file.id} className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${selected ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-100"}`}>
                {/* Selection checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                  className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border text-white transition ${selected ? "border-indigo-500 bg-indigo-500" : "border-white/70 bg-black/20 opacity-0 group-hover:opacity-100"}`}
                >
                  {selected && <span className="text-xs">✓</span>}
                </button>
                {/* Image */}
                <button onClick={() => setLightboxIndex(idx)} className="block w-full">
                  {url ? (
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      <img src={url} alt={file.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                        <ZoomIn size={20} className="text-white opacity-0 transition group-hover:opacity-80" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-gray-50 text-gray-400">
                      <FileImage size={24} />
                    </div>
                  )}
                </button>
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-gray-800">{file.name}</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{file.modified ?? ""}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">{category}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "masonry" ? (
        /* Masonry View */
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {filteredFiles.map((file, idx) => {
            const url = urlMap[file.id];
            const selected = selectedIds.has(file.id);
            const category = guessCategory(file.name);
            return (
              <article key={file.id} className={`group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${selected ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-100"}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                  className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border text-white transition ${selected ? "border-indigo-500 bg-indigo-500" : "border-white/70 bg-black/20 opacity-0 group-hover:opacity-100"}`}
                >
                  {selected && <span className="text-xs">✓</span>}
                </button>
                <button onClick={() => setLightboxIndex(idx)} className="block w-full text-left">
                  {url ? (
                    <div className="relative overflow-hidden bg-gray-50">
                      <img src={url} alt={file.name} className="h-auto w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                        <ZoomIn size={20} className="text-white opacity-0 transition group-hover:opacity-80" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-gray-50 text-gray-400">
                      <FileImage size={24} />
                    </div>
                  )}
                </button>
                <div className="border-t border-gray-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <p className="text-xs text-gray-500">{file.modified ?? ""}</p>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">{category}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredFiles.length && filteredFiles.length > 0}
                    onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="w-12 px-2 py-2">Thumb</th>
                <th className="px-3 py-2">File Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Modified</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredFiles.map((file, idx) => {
                const url = urlMap[file.id];
                const selected = selectedIds.has(file.id);
                return (
                  <tr key={file.id} className={`hover:bg-gray-50 ${selected ? "bg-indigo-50/50" : ""}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(file.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => setLightboxIndex(idx)} className="block">
                        {url ? (
                          <img src={url} alt="" className="h-8 w-8 rounded object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-gray-400">
                            <FileImage size={12} />
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => setLightboxIndex(idx)} className="font-semibold text-gray-800 hover:text-indigo-600">{file.name}</button>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{guessCategory(file.name)}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{getExtension(file)}</td>
                    <td className="px-3 py-2 text-gray-500">{file.modified ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => { if (url) { const a = document.createElement("a"); a.href = url; a.download = file.name; a.target = "_blank"; a.click(); } }}
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

      {/* ─── Lightbox ─── */}
      {lightboxIndex !== null && lightboxFile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setLightboxIndex(null)}>
          {/* Top bar */}
          <div className="flex items-center justify-between bg-black/60 px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                disabled={lightboxIndex === 0}
                className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{lightboxFile.name}</p>
                <p className="text-[10px] text-gray-400">
                  {lightboxIndex + 1} of {filteredFiles.length} · {guessCategory(lightboxFile.name)} · {getExtension(lightboxFile)}
                </p>
              </div>
              <button
                onClick={() => setLightboxIndex((i) => (i !== null && i < filteredFiles.length - 1 ? i + 1 : i))}
                disabled={lightboxIndex === filteredFiles.length - 1}
                className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (lightboxUrl) {
                    const a = document.createElement("a"); a.href = lightboxUrl; a.download = lightboxFile.name; a.target = "_blank"; a.click();
                  }
                }}
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                title="Download"
              >
                <Download size={16} />
              </button>
              <button onClick={() => setLightboxIndex(null)} className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {/* Prev/Next arrows on sides */}
            <button
              onClick={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
              disabled={lightboxIndex === 0}
              className="absolute left-4 rounded-full bg-black/40 p-2 text-white/70 hover:bg-black/60 hover:text-white disabled:opacity-20"
            >
              <ChevronLeft size={24} />
            </button>
            {lightboxUrl ? (
              <img
                src={lightboxUrl}
                alt={lightboxFile.name}
                className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-gray-800 text-gray-500">
                <FileImage size={48} />
              </div>
            )}
            <button
              onClick={() => setLightboxIndex((i) => (i !== null && i < filteredFiles.length - 1 ? i + 1 : i))}
              disabled={lightboxIndex === filteredFiles.length - 1}
              className="absolute right-4 rounded-full bg-black/40 p-2 text-white/70 hover:bg-black/60 hover:text-white disabled:opacity-20"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
