"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Library, Loader2, Plus, UploadCloud } from "lucide-react";
import { useEditorStore } from "./editor-store";
import { useMediaUpload, MEDIA_CHANGED_EVENT } from "./use-media-upload";

const CLIP_DND = "application/x-cs-clip";

type BinTab = "project" | "library";

type MediaAsset = {
  id: string;
  kind: string;
  filename: string | null;
  status: "uploaded" | "processing" | "ready" | "failed";
  durationSec: number | null;
  thumbnailUrl: string | null;
  proxyUrl: string | null;
};

const LIBRARY_CATEGORIES = [
  "Transitions", "Music", "Sound FX", "Titles", "Logos / Brand", "Looks", "Presets",
];

/** Left rail: project media (upload + ingest) vs the org-level reusable Library. */
export function MediaBinPanel() {
  const [tab, setTab] = useState<BinTab>("project");
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-white/10 bg-[#0B0F15]/60">
      <div className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">Media</div>
      <div className="flex items-center gap-1 px-2 pb-2">
        <BinTabButton active={tab === "project"} onClick={() => setTab("project")} label="Project" />
        <BinTabButton active={tab === "library"} onClick={() => setTab("library")} label="Library" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {tab === "project" ? <ProjectTab /> : <LibraryTab />}
      </div>
    </div>
  );
}

function ProjectTab() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles } = useMediaUpload();

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/content-studio/media");
      if (!res.ok) return;
      const json = await res.json();
      setAssets(json.assets ?? json.data?.assets ?? []);
    } catch {
      /* harness / unauth — ignore */
    }
  }, []);

  useEffect(() => {
    refetch();
    const onChanged = () => refetch();
    window.addEventListener(MEDIA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(MEDIA_CHANGED_EVENT, onChanged);
  }, [refetch]);

  // Poll while anything is still ingesting.
  useEffect(() => {
    if (!assets.some((a) => a.status === "processing")) return;
    const t = setInterval(refetch, 3000);
    return () => clearInterval(t);
  }, [assets, refetch]);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || (files as FileList).length === 0) return;
      setBusy(true);
      try {
        await uploadFiles(files);
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [uploadFiles, refetch],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
      className={`space-y-2 rounded-md ${dragOver ? "outline-dashed outline-2 outline-[#3D8EFF] bg-[#3D8EFF]/10" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 py-2 text-xs text-white/60 hover:bg-white/5 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {busy ? "Uploading…" : "Import clips / photos"}
      </button>

      {assets.length === 0 ? (
        <EmptyHint
          icon={<UploadCloud className="h-5 w-5" />}
          text="Drag clips/photos here from your computer, or use Import above."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset }: { asset: MediaAsset }) {
  const addClip = useEditorStore((s) => s.addClip);
  const ready = asset.status === "ready" && !!asset.proxyUrl;

  const payload = () =>
    JSON.stringify({
      assetId: asset.id,
      name: asset.filename ?? "clip",
      src: asset.proxyUrl,
      durationSec: asset.durationSec ?? 0,
    });

  return (
    <div
      draggable={ready}
      onDragStart={(e) => ready && e.dataTransfer.setData(CLIP_DND, payload())}
      onClick={() => ready && addClip({ assetId: asset.id, name: asset.filename ?? "clip", src: asset.proxyUrl!, durationSec: asset.durationSec ?? 0 })}
      title={ready ? "Click or drag to add to timeline" : asset.status}
      className={`overflow-hidden rounded-md border border-white/10 bg-white/[0.03] ${ready ? "cursor-grab active:cursor-grabbing hover:border-[#3D8EFF]/50" : ""}`}
    >
      <div className="relative flex aspect-video items-center justify-center bg-black/40">
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnailUrl} alt={asset.filename ?? "clip"} className="h-full w-full object-cover" />
        ) : (
          <span className="text-white/25">
            {asset.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
          </span>
        )}
        <span className="absolute bottom-1 left-1 rounded-sm bg-black/70 px-1 text-[9px] uppercase tracking-wide text-white/70">
          {asset.status}
        </span>
      </div>
      <div className="truncate px-1.5 py-1 text-[10px] text-white/55">{asset.filename ?? "clip"}</div>
    </div>
  );
}

function LibraryTab() {
  return (
    <div className="space-y-1">
      {LIBRARY_CATEGORIES.map((cat) => (
        <div key={cat} className="flex items-center justify-between rounded-md border border-white/10 px-2.5 py-2 text-xs text-white/70">
          <span>{cat}</span>
          <span className="text-white/30">0</span>
        </div>
      ))}
      <EmptyHint icon={<Library className="h-5 w-5" />} text="Saved transitions, music, titles, logos, and Looks reuse across every project." />
    </div>
  );
}

function BinTabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${active ? "bg-[#3D8EFF]/20 text-white" : "text-white/50 hover:bg-white/5"}`}
    >
      {label}
    </button>
  );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 px-3 text-center text-[11px] text-white/35">
      <span className="text-white/25">{icon}</span>
      {text}
    </div>
  );
}
