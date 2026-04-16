"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { type PhotoFile, type ViewMode, type SortBy, isImage, getExtension, guessCategory } from "./_shared";
import PhotosGallery from "./PhotosGallery";
import PhotosListView from "./PhotosListView";
import PhotosLightbox from "./PhotosLightbox";
import PhotosToolbar from "./PhotosToolbar";

type FolderRow = { id: string; name: string };

export default function ProjectPhotosPage() {
	const params = useParams<{ projectId: string }>();
	const projectId = params?.projectId;

	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [files, setFiles] = useState<PhotoFile[]>([]);
	const [urlMap, setUrlMap] = useState<Record<string, string>>({});
	const [toast, setToast] = useState<string | null>(null);

	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("All");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortBy>("name");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
				const photosFolder = folders.find((f) => f.name.toLowerCase() === "photos");
				if (!photosFolder) { if (!cancelled) { setFiles([]); setUrlMap({}); } return; }

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
					setUrlMap(signedEntries.reduce<Record<string, string>>((acc, [id, url]) => { if (url) acc[id] = url; return acc; }, {}));
				}
			} finally { if (!cancelled) setLoading(false); }
		};
		void load();
		return () => { cancelled = true; };
	}, [projectId]);

	useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(t); }, [toast]);

	const filteredFiles = useMemo(() => {
		let result = [...files];
		if (search.trim()) { const q = search.toLowerCase(); result = result.filter((f) => f.name.toLowerCase().includes(q)); }
		if (categoryFilter !== "All") result = result.filter((f) => guessCategory(f.name) === categoryFilter);
		result.sort((a, b) => {
			if (sortBy === "name") return a.name.localeCompare(b.name);
			if (sortBy === "date") return (b.modified ?? "").localeCompare(a.modified ?? "");
			if (sortBy === "type") return getExtension(a).localeCompare(getExtension(b));
			return 0;
		});
		return result;
	}, [files, search, categoryFilter, sortBy]);

	useEffect(() => {
		if (lightboxIndex === null) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") setLightboxIndex(null);
			if (e.key === "ArrowLeft") setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
			if (e.key === "ArrowRight") setLightboxIndex((i) => (i !== null && i < filteredFiles.length - 1 ? i + 1 : i));
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [filteredFiles.length, lightboxIndex]);

	const categories = useMemo(() => { const s = new Set<string>(); files.forEach((f) => s.add(guessCategory(f.name))); return ["All", ...Array.from(s).sort()]; }, [files]);
	const categoryCounts = useMemo(() => { const c: Record<string, number> = {}; files.forEach((f) => { const k = guessCategory(f.name); c[k] = (c[k] ?? 0) + 1; }); return c; }, [files]);
	const typeCounts = useMemo(() => { const c: Record<string, number> = {}; files.forEach((f) => { const k = getExtension(f); c[k] = (c[k] ?? 0) + 1; }); return c; }, [files]);

	const toggleSelect = useCallback((id: string) => { setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
	const selectAll = () => setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
	const clearSelection = () => setSelectedIds(new Set());

	const handleDownloadSelected = () => {
		selectedIds.forEach((id) => { const url = urlMap[id]; const file = files.find((x) => x.id === id); if (url && file) { const a = document.createElement("a"); a.href = url; a.download = file.name; a.target = "_blank"; a.click(); } });
		setToast(`Downloading ${selectedIds.size} photo${selectedIds.size !== 1 ? "s" : ""}...`);
	};

	const onGenerateReport = async () => {
		if (!projectId || generating) return;
		setGenerating(true);
		setToast("Generating photo report...");
		try {
			const res = await fetch(`/api/projects/${projectId}/photo-report`, { method: "POST", headers: { "Content-Type": "application/json" } });
			const payload = (await res.json().catch(() => ({}))) as { error?: string; fileName?: string };
			if (!res.ok) throw new Error(payload.error ?? "Failed to generate photo report");
			setToast(`Photo report generated: ${payload.fileName ?? "PDF created"}`);
		} catch (error) {
			setToast(error instanceof Error ? error.message : "Failed to generate photo report");
		} finally {
			setGenerating(false);
		}
	};

	if (!projectId) return <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-sm font-semibold text-red-400">Invalid project route.</div>;

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Photos</p>
					<h2 className="text-lg font-black text-white">Photo Log</h2>
					<p className="mt-0.5 inline-block rounded-md bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-semibold text-[#D4AF37] ring-1 ring-[#D4AF37]/20">Saved to /Photos/</p>
				</div>
				<button onClick={onGenerateReport} disabled={generating}
					className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E64500] disabled:opacity-60">
					{generating ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
					{generating ? "Generating..." : "Generate Photo Report"}
				</button>
			</div>

			{!loading && files.length > 0 && (
				<PhotosToolbar
					search={search} setSearch={setSearch}
					categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
					viewMode={viewMode} setViewMode={setViewMode}
					sortBy={sortBy} setSortBy={setSortBy}
					categories={categories} categoryCounts={categoryCounts} typeCounts={typeCounts}
					totalFiles={files.length} filteredCount={filteredFiles.length}
					selectedIds={selectedIds} handleDownloadSelected={handleDownloadSelected}
					clearSelection={clearSelection} selectAll={selectAll}
				/>
			)}

			{loading ? (
				<div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-sm text-zinc-400">
					<Loader2 size={16} className="mr-2 inline animate-spin" /> Loading photos...
				</div>
			) : files.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-12 text-center">
					<Camera size={40} className="mx-auto mb-3 text-zinc-600" />
					<p className="text-sm font-semibold text-zinc-300">No photos uploaded yet</p>
					<p className="mt-1 text-xs text-zinc-500">Upload images to your project&apos;s &quot;Photos&quot; folder in SlateDrop</p>
				</div>
			) : filteredFiles.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-8 text-center text-sm text-zinc-400">No photos match your search or filter.</div>
			) : viewMode === "list" ? (
				<PhotosListView files={filteredFiles} urlMap={urlMap} selectedIds={selectedIds} toggleSelect={toggleSelect} selectAll={selectAll} clearSelection={clearSelection} onOpenLightbox={setLightboxIndex} />
			) : (
				<PhotosGallery mode={viewMode} files={filteredFiles} urlMap={urlMap} selectedIds={selectedIds} toggleSelect={toggleSelect} onOpenLightbox={setLightboxIndex} />
			)}

			{lightboxIndex !== null && (
				<PhotosLightbox
					index={lightboxIndex} files={filteredFiles} urlMap={urlMap}
					onClose={() => setLightboxIndex(null)}
					onPrev={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
					onNext={() => setLightboxIndex((i) => (i !== null && i < filteredFiles.length - 1 ? i + 1 : i))}
				/>
			)}

			{toast && (
				<div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-900/50 bg-emerald-950/80 px-4 py-2 text-sm font-medium text-emerald-400 shadow-lg">{toast}</div>
			)}
		</section>
	);
}