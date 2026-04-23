"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Loader2, Search } from "lucide-react";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import { type DrawingFile, type FolderRow, type ViewMode, DRAWING_SETS, isPdf, guessSet } from "./_shared";
import DrawingsGrid from "./DrawingsGrid";
import DrawingsList from "./DrawingsList";
import DrawingsViewer from "./DrawingsViewer";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function ProjectDrawingsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<DrawingFile[]>([]);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<DrawingFile | null>(null);
  const [search, setSearch] = useState("");
  const [setFilter, setSetFilter] = useState<string>("All Sets");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-drawings-${projectId}`, []);
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
        if (!drawingsFolder) { if (!cancelled) { setFiles([]); setUrlMap({}); } return; }

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
          setUrlMap(signedEntries.reduce<Record<string, string>>((acc, [id, url]) => { if (url) acc[id] = url; return acc; }, {}));
        }
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((f) => f.name.toLowerCase().includes(q)); }
    if (setFilter !== "All Sets") result = result.filter((f) => guessSet(f.name) === setFilter);
    return result;
  }, [files, search, setFilter]);

  const setCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((f) => { const s = guessSet(f.name); counts[s] = (counts[s] ?? 0) + 1; });
    return counts;
  }, [files]);

  const handlePageCount = (id: string, count: number) => setPageCounts((prev) => ({ ...prev, [id]: count }));

  if (!projectId) return <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Drawings</p>
          <h2 className="text-lg font-black text-foreground">Plans & Drawings Viewer</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-300">{files.length}</span> drawing{files.length !== 1 ? "s" : ""} uploaded
          {Object.keys(setCounts).length > 0 && <span>· {Object.keys(setCounts).length} set{Object.keys(setCounts).length !== 1 ? "s" : ""}</span>}
          <span className="ml-1 rounded-md bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3B82F6] ring-1 ring-[#3B82F6]/20">Saved to /Drawings/</span>
        </div>
      </header>

      {/* Stats */}
      {!loading && files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div className="rounded-xl border border-zinc-800 bg-card px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Total</p>
            <p className="text-lg font-black text-foreground">{files.length}</p>
          </div>
          {Object.entries(setCounts).slice(0, 5).map(([set, count]) => (
            <div key={set} className="rounded-xl border border-zinc-800 bg-card px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-zinc-500 truncate">{set}</p>
              <p className="text-lg font-black text-foreground">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      {!loading && files.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drawings…" className="rounded-lg border border-zinc-700 bg-card py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/30 w-56" />
            </div>
            <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} className="rounded-lg border border-zinc-700 bg-card px-2.5 py-1.5 text-xs text-zinc-300 focus:border-[#3B82F6] focus:outline-none">
              {DRAWING_SETS.map((s) => <option key={s} value={s}>{s}{s !== "All Sets" && setCounts[s] ? ` (${setCounts[s]})` : ""}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode("grid")} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${viewMode === "grid" ? "bg-[#3B82F6] text-foreground" : "border border-zinc-700 bg-card text-zinc-400 hover:bg-card"}`}>Grid</button>
            <button onClick={() => setViewMode("list")} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${viewMode === "list" ? "bg-[#3B82F6] text-foreground" : "border border-zinc-700 bg-card text-zinc-400 hover:bg-card"}`}>List</button>
            <ViewCustomizer storageKey={`viewprefs-drawings-${projectId}`} cols={[]} defaultCols={[]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-card p-8 text-sm text-zinc-400"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading drawings…</div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-card p-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-300">No drawings uploaded yet</p>
          <p className="mt-1 text-xs text-zinc-500">Upload PDF drawings to your project&apos;s &quot;Drawings&quot; folder in SlateDrop</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-card p-8 text-center text-sm text-zinc-400">No drawings match your search or filter.</div>
      ) : viewMode === "grid" ? (
        <DrawingsGrid files={filteredFiles} urlMap={urlMap} pageCounts={pageCounts} onSelect={setActiveFile} onPageCount={handlePageCount} />
      ) : (
        <DrawingsList files={filteredFiles} urlMap={urlMap} pageCounts={pageCounts} onSelect={setActiveFile} />
      )}

      {/* Viewer */}
      {activeFile && (
        <DrawingsViewer file={activeFile} url={urlMap[activeFile.id] ?? null} filteredFiles={filteredFiles} pageCounts={pageCounts} onClose={() => setActiveFile(null)} onSelectFile={setActiveFile} onPageCount={handlePageCount} />
      )}
    </section>
  );
}
