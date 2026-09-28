"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X, ZoomIn, ZoomOut } from "lucide-react";

const MAX_ZOOM = 5;
type View = { z: number; x: number; y: number };
const FIT: View = { z: 1, x: 0, y: 0 };

/**
 * Full-screen photo/drawing inspector over the viewer: pinch / wheel / double-tap / +− to zoom, drag to pan when
 * zoomed. Closes with the Close button, a tap on the dark backdrop (outside the image), or Escape. Tapping the
 * image never closes it (so inspecting isn't fragile).
 */
export function MediaViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [view, setView] = useState<View>(FIT);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; z: number; moved: boolean; lastTap: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); // close only the viewer, not the sheet under it
      onClose();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [onClose]);

  const clampPan = (v: View): View => {
    const el = stage.current;
    if (!el || v.z <= 1) return FIT;
    const mx = (el.clientWidth * (v.z - 1)) / 2;
    const my = (el.clientHeight * (v.z - 1)) / 2;
    return { z: v.z, x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) };
  };
  const zoomTo = (z: number) => setView((v) => clampPan({ ...v, z: Math.max(1, Math.min(MAX_ZOOM, z)) }));

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = { dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0, z: view.z, moved: false, lastTap: lastTap.current };
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && gesture.current.dist > 0) {
      gesture.current.moved = true;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      zoomTo((gesture.current.z * d) / gesture.current.dist);
    } else if (pts.length === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) gesture.current.moved = true;
      setView((v) => clampPan({ z: v.z, x: v.x + dx, y: v.y + dy }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0 || !g) return;
    gesture.current = null;
    if (g.moved) return;
    const now = performance.now();
    if (now - lastTap.current < 320) {
      setView((v) => (v.z > 1 ? FIT : clampPan({ z: 2.5, x: 0, y: 0 }))); // double-tap: zoom in / back to fit
      lastTap.current = 0;
    } else lastTap.current = now;
  };

  return (
    <div
      data-r213-ui
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--graphite-canvas)]"
      style={{ touchAction: "none", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      onPointerDown={(e) => e.stopPropagation()}
      // Any tap that isn't on the image or a control closes (title bar, hint, dark margins) — unless zoomed in,
      // where a stray tap beside the image must not throw away the inspection.
      onClick={(e) => view.z === 1 && !(e.target as Element).closest("button, a, img") && onClose()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-[14px] font-semibold text-[var(--mkt-surface)]">{title}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => zoomTo(view.z / 1.5)} className="flex size-11 items-center justify-center rounded-lg text-[var(--mkt-surface)] hover:bg-white/10">
            <ZoomOut className="size-5" aria-hidden />
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => zoomTo(view.z * 1.5)} className="flex size-11 items-center justify-center rounded-lg text-[var(--mkt-surface)] hover:bg-white/10">
            <ZoomIn className="size-5" aria-hidden />
          </button>
          <a href={src} target="_blank" rel="noopener" aria-label="Open original" className="flex size-11 items-center justify-center rounded-lg text-[var(--mkt-surface)] hover:bg-white/10">
            <ExternalLink className="size-5" aria-hidden />
          </a>
          <button ref={closeRef} type="button" onClick={onClose} className="flex min-h-[44px] items-center gap-1 rounded-lg bg-[var(--mkt-surface)] px-3 text-[13px] font-semibold text-[var(--mkt-ink)]">
            <X className="size-4" aria-hidden /> Close
          </button>
        </div>
      </div>
      <div
        ref={stage}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
        onWheel={(e) => zoomTo(view.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
      >
        {failed ? (
          <a href={src} target="_blank" rel="noopener" className="rounded-lg bg-[var(--mkt-surface)] px-4 py-3 text-[13px] font-semibold text-[var(--mkt-ink)]">
            Preview unavailable — open the file
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={title}
            draggable={false}
            onError={() => setFailed(true)}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="max-h-full max-w-full select-none object-contain"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, cursor: view.z > 1 ? "grab" : "zoom-in", transition: gesture.current ? "none" : "transform 120ms ease-out" }}
          />
        )}
      </div>
      <p className="pb-2 text-center text-[11px] text-[var(--mkt-canvas-deep)]">Pinch or double-tap to zoom · drag to move · tap outside to close</p>
    </div>
  );
}
