"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import type { PhotoAttachmentFile } from "@/lib/site-walk/photo-attachments";

type PreviewState = { url: string | null; loading: boolean; error: string | null };
type ZoomState = { scale: number; x: number; y: number };

type Props = {
  file: PhotoAttachmentFile;
  onClose: () => void;
};

export function PhotoAttachmentFilePreviewModal({ file, onClose }: Props) {
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; origin: ZoomState } | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ url: null, loading: true, error: null });
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      setPreview({ url: null, loading: true, error: null });
      try {
        const response = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}&mode=preview`, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!response.ok || !data?.url) throw new Error(data?.error ?? "Preview unavailable.");
        if (!cancelled) setPreview({ url: data.url, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setPreview({ url: null, loading: false, error: error instanceof Error ? error.message : "Preview unavailable." });
      }
    }
    setZoom({ scale: 1, x: 0, y: 0 });
    void loadPreview();
    return () => { cancelled = true; };
  }, [file.id]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isImage) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: distance(a, b), scale: zoom.scale };
      return;
    }
    panRef.current = { x: event.clientX, y: event.clientY, origin: zoom };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isImage || !pointersRef.current.has(event.pointerId)) return;
    event.stopPropagation();
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      setZoom((current) => ({ ...current, scale: clamp((distance(a, b) / pinchRef.current!.distance) * pinchRef.current!.scale, 1, 5) }));
      return;
    }
    if (panRef.current && zoom.scale > 1) setZoom({ ...panRef.current.origin, x: panRef.current.origin.x + event.clientX - panRef.current.x, y: panRef.current.origin.y + event.clientY - panRef.current.y });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    panRef.current = null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/76 p-4" role="dialog" aria-label={`Preview ${file.name}`} onClick={onClose} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
      <div className="relative flex max-h-[62dvh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-2 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-cyan-300 text-slate-950 shadow-xl" aria-label="Close preview"><X className="h-5 w-5" /></button>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
          <p className="min-w-0 pr-12 truncate text-sm font-black text-white">{file.name}</p>
        </div>
        <div className="h-[36dvh] min-h-48 flex-1 overflow-hidden bg-black">
          {preview.loading ? <div className="flex h-full items-center justify-center text-white"><Loader2 className="h-6 w-6 animate-spin" /></div> : preview.error ? <div className="flex h-full items-center justify-center p-6 text-center text-sm font-bold text-rose-100">{preview.error}</div> : isImage ? <div className="flex h-full touch-none items-center justify-center overflow-hidden" style={{ touchAction: "none" }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}><img src={preview.url ?? ""} alt={file.name} className="max-h-full max-w-full object-contain" style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`, transformOrigin: "center" }} draggable={false} /></div> : <iframe src={preview.url ?? ""} title={file.name} className="h-full w-full bg-white" />}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2"><p className="text-[10px] font-bold text-white/50">Pinch image previews to zoom.</p>{preview.url && <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-cyan-100"><ExternalLink className="h-4 w-4" /> Open</a>}</div>
      </div>
    </div>
  );
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
