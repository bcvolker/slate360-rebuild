"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X, ZoomIn, ZoomOut } from "lucide-react";

const MAX_ZOOM = 8;
type View = { z: number; x: number; y: number };
const FIT: View = { z: 1, x: 0, y: 0 };

/**
 * Full-screen photo/drawing inspector over the viewer.
 * - Gestures work anywhere on the stage (not only on the image): pinch zooms around the fingers, one finger pans,
 *   double-tap zooms in at the tapped point (again = back to fit), wheel/± buttons zoom.
 * - Small or oddly shaped media (e.g. a portrait drawing in a landscape phone) opens filling the screen instead
 *   of as a small fitted box.
 * - Closes with Close, Escape (only the viewer), or a plain tap outside the image while not zoomed in.
 */
export function MediaViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [view, setView] = useState<View>(FIT);
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; z: number; x: number; y: number; mid: { x: number; y: number } } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef(0);
  const fillZoom = useRef(2.5);

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

  /** Keep the zoomed image covering the stage: pan limited to the overflow of the displayed image. */
  const clamp = (v: View): View => {
    const s = stage.current;
    const i = img.current;
    if (!s || !i || v.z <= 1) return FIT;
    const mx = Math.max(0, (i.offsetWidth * v.z - s.clientWidth) / 2);
    const my = Math.max(0, (i.offsetHeight * v.z - s.clientHeight) / 2);
    return { z: v.z, x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) };
  };
  /** Point in stage-centre coordinates. */
  const local = (cx: number, cy: number) => {
    const r = stage.current!.getBoundingClientRect();
    return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) };
  };
  /** Zoom to `z`, keeping the content under stage point `p` fixed. */
  const zoomAt = (from: View, z: number, p = { x: 0, y: 0 }): View => {
    const nz = Math.max(1, Math.min(MAX_ZOOM, z));
    const k = nz / from.z;
    return clamp({ z: nz, x: p.x - (p.x - from.x) * k, y: p.y - (p.y - from.y) * k });
  };

  const onLoad = () => {
    const s = stage.current;
    const i = img.current;
    if (!s || !i) return;
    const coverZ = Math.max(s.clientWidth / i.offsetWidth, s.clientHeight / i.offsetHeight);
    fillZoom.current = Math.min(MAX_ZOOM, Math.max(2.5, coverZ));
    // Fitted box uses little of the screen → open filled (capped so a photo isn't absurdly cropped).
    const used = (i.offsetWidth * i.offsetHeight) / (s.clientWidth * s.clientHeight);
    if (used < 0.55) setView(clamp({ z: Math.min(coverZ, 3), x: 0, y: 0 }));
  };

  const onDown = (e: React.PointerEvent) => {
    stage.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) moved.current = false;
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      moved.current = true;
      pinch.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), ...view, mid: local((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2) };
    }
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length >= 2 && pinch.current) {
      const p = pinch.current;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setView(zoomAt({ z: p.z, x: p.x, y: p.y }, (p.z * d) / Math.max(1, p.dist), p.mid));
    } else if (pts.length === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
      setView((v) => clamp({ z: v.z, x: v.x + dx, y: v.y + dy }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size > 0) return;
    setDragging(false);
    if (moved.current) return;
    const r = img.current?.getBoundingClientRect();
    const onImage = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!onImage && view.z <= 1.05) return onClose(); // plain tap beside the image
    const now = performance.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      const p = local(e.clientX, e.clientY);
      setView((v) => (v.z > 1.05 ? FIT : zoomAt(v, fillZoom.current, p))); // double-tap: zoom in here / back to fit
    } else lastTap.current = now;
  };

  return (
    <div
      data-r213-ui
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--graphite-canvas)]"
      // All four safe areas: in landscape the camera cutout sits on a side edge and must not cover the title/Close.
      style={{ touchAction: "none", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
      onPointerDown={(e) => e.stopPropagation()}
      // A plain tap outside the image and controls closes — never after a pan/pinch, never while zoomed in.
      onClick={(e) => view.z === 1 && !moved.current && !(e.target as Element).closest("button, a, img, [data-stage]") && onClose()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-[14px] font-semibold text-[var(--mkt-surface)]">{title}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => setView((v) => zoomAt(v, v.z / 1.6))} className="flex size-11 items-center justify-center rounded-lg text-[var(--mkt-surface)] hover:bg-white/10">
            <ZoomOut className="size-5" aria-hidden />
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => setView((v) => zoomAt(v, v.z * 1.6))} className="flex size-11 items-center justify-center rounded-lg text-[var(--mkt-surface)] hover:bg-white/10">
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
        data-stage
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => {
          const p = local(e.clientX, e.clientY);
          setView((v) => zoomAt(v, v.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p));
        }}
      >
        {failed ? (
          <a href={src} target="_blank" rel="noopener" className="rounded-lg bg-[var(--mkt-surface)] px-4 py-3 text-[13px] font-semibold text-[var(--mkt-ink)]">
            Preview unavailable — open the file
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={img}
            src={src}
            alt={title}
            draggable={false}
            onLoad={onLoad}
            onError={() => setFailed(true)}
            className="max-h-full max-w-full select-none object-contain"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, cursor: view.z > 1 ? "grab" : "zoom-in", transition: dragging ? "none" : "transform 120ms ease-out" }}
          />
        )}
      </div>
      <p className="pb-2 text-center text-[11px] text-[var(--mkt-canvas-deep)]">Pinch or double-tap to zoom · drag to move · tap outside to close</p>
    </div>
  );
}
