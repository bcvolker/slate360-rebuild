"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import { hitWalkOverlay, type DirectedWalkOverlay, type WalkHit } from "@/lib/spatial-walkthrough/directed-walk-plan";
import { sharePath, type ShareLocator } from "@/lib/spatial-walkthrough/share-locator";

export type PlanWalkSheet = {
  id: string;
  sheetNumber: string;
  title: string;
  imageUrl: string | null;
  width: number;
  height: number;
};

type View = { x: number; y: number; k: number };

function clock(t: number): string {
  const seconds = Math.max(0, Math.round(t));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function walkHref(token: string, hit: WalkHit): string | null {
  if (hit.t == null) return null;
  const locator: ShareLocator = {
    walkthroughId: null,
    clipId: hit.clipId,
    chapterId: null,
    tSeconds: hit.t,
    yawDeg: null,
    pitchDeg: null,
    pinId: null,
  };
  return sharePath(token, locator);
}

/** Drawing stage: the directed walk sits on the sheet, and a click seeks that leg. */
export function PlanWalkCanvas({
  sheets,
  overlays,
  token,
}: {
  sheets: PlanWalkSheet[];
  overlays: Record<string, DirectedWalkOverlay>;
  token: string;
}) {
  const [sheetId, setSheetId] = useState(sheets[0]?.id ?? "");
  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  const overlay = sheet ? overlays[sheet.id] : undefined;
  const hostRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0.4 });
  const [hit, setHit] = useState<WalkHit | null>(null);
  const width = sheet && sheet.width > 0 ? sheet.width : 1600;
  const height = sheet && sheet.height > 0 ? sheet.height : 1100;

  const fit = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const boxW = host.clientWidth;
    const boxH = host.clientHeight;
    if (boxW < 48 || boxH < 48) return;
    const pad = 20;
    const k = Math.max(0.05, Math.min((boxW - pad * 2) / width, (boxH - pad * 2) / height));
    setView({ k, x: (boxW - width * k) / 2, y: (boxH - height * k) / 2 });
  }, [width, height]);

  useEffect(() => {
    setHit(null);
    fit();
    const settle = window.setTimeout(fit, 280);
    const observer = new ResizeObserver(() => fit());
    if (hostRef.current) observer.observe(hostRef.current);
    return () => {
      window.clearTimeout(settle);
      observer.disconnect();
    };
  }, [fit, sheet?.id]);

  const zoomAt = useCallback((factor: number) => {
    setView((current) => {
      const host = hostRef.current;
      const cx = (host?.clientWidth ?? 0) / 2;
      const cy = (host?.clientHeight ?? 0) / 2;
      const k = Math.min(3, Math.max(0.08, current.k * factor));
      const ratio = k / current.k;
      return { k, x: cx - (cx - current.x) * ratio, y: cy - (cy - current.y) * ratio };
    });
  }, []);

  if (!sheet || !overlay) {
    return <p className="text-sm text-[var(--portal-ink-muted)]">This drawing is not ready to view yet.</p>;
  }

  const stroke = 1 / view.k;
  const openHref = hit ? walkHref(token, hit) : null;

  function onPointerDown(event: React.PointerEvent) {
    if ((event.target as HTMLElement).closest("button, a")) return;
    moved.current = false;
    drag.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event: React.PointerEvent) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    setView((current) => ({ ...current, x: start.vx + dx, y: start.vy + dy }));
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onClick(event: React.MouseEvent) {
    if (moved.current || (event.target as HTMLElement).closest("button, a")) return;
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const u = (event.clientX - rect.left - view.x) / view.k / width;
    const v = (event.clientY - rect.top - view.y) / view.k / height;
    const next = hitWalkOverlay(overlay!, u, v);
    setHit(next);
    if (!next) return;
    const boxW = host.clientWidth;
    const boxH = host.clientHeight;
    setView((current) => {
      const k = Math.max(current.k, 0.7);
      return { k, x: boxW / 2 - next.u * width * k, y: boxH / 2 - next.v * height * k };
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--portal-line)] bg-[var(--portal-surface)]" data-testid="portal-plan-walk" data-accuracy={overlay.accuracy}>
      {sheets.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--portal-line)] px-3 py-2">
          {sheets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSheetId(item.id)}
              aria-current={item.id === sheet.id ? "true" : undefined}
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm ${item.id === sheet.id ? "border-[var(--portal-accent-line)] bg-[var(--portal-accent-soft)] text-[var(--portal-ink)]" : "border-[var(--portal-line)] text-[var(--portal-ink-muted)]"}`}
            >
              {item.sheetNumber} · {item.title}
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={hostRef}
        className="relative h-[min(70dvh,760px)] min-h-[420px] cursor-grab overflow-hidden bg-[var(--portal-canvas-alt)] active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
      >
        <div className="absolute left-0 top-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, width, height, transformOrigin: "0 0" }}>
          {sheet.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sheet.imageUrl} width={width} height={height} alt={`${sheet.sheetNumber} ${sheet.title}`} draggable={false} className="block h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--portal-ink-muted)]">Drawing image unavailable</div>
          )}
          <svg className="absolute inset-0" width={width} height={height} viewBox={`0 0 ${width} ${height}`} data-testid="plan-walk-path" aria-hidden="true">
            {overlay.segments.map((segment) => {
              const active = hit?.segmentKey === segment.key;
              return (
                <line
                  key={segment.key}
                  x1={segment.a.u * width}
                  y1={segment.a.v * height}
                  x2={segment.b.u * width}
                  y2={segment.b.v * height}
                  stroke={active ? "var(--portal-accent)" : "var(--portal-ink)"}
                  strokeOpacity={active ? 1 : 0.85}
                  strokeWidth={(active ? 7 : 4) * stroke}
                  strokeLinecap="round"
                />
              );
            })}
            {overlay.points.map((point) => (
              <circle key={point.id} cx={point.u * width} cy={point.v * height} r={(hit?.pointId === point.id ? 8 : 5) * stroke} fill="var(--portal-surface)" stroke="var(--portal-accent)" strokeWidth={2 * stroke} />
            ))}
            {hit ? <circle cx={hit.u * width} cy={hit.v * height} r={11 * stroke} fill="var(--portal-accent)" /> : null}
          </svg>
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--portal-line)] bg-[var(--portal-surface)] text-[var(--portal-ink)]" onClick={() => zoomAt(1.25)} aria-label="Zoom in"><Plus size={16} /></button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--portal-line)] bg-[var(--portal-surface)] text-[var(--portal-ink)]" onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--portal-line)] bg-[var(--portal-surface)] text-[var(--portal-ink)]" onClick={fit} aria-label="Fit drawing"><Scan size={16} /></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--portal-line)] px-4 py-3" data-testid="plan-walk-selection">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--portal-ink)]">{sheet.sheetNumber} · {sheet.title}</p>
          <p className="text-sm text-[var(--portal-ink-muted)]">{hit ? `${hit.label || "This part of the walk"}${hit.t != null ? ` · ${clock(hit.t)}` : ""}` : overlay.note}</p>
        </div>
        {openHref ? (
          <a href={openHref} data-testid="plan-walk-open" className="inline-flex h-10 items-center rounded-[10px] bg-[var(--portal-accent)] px-4 text-sm font-semibold text-white">
            Open this part of the walk
          </a>
        ) : null}
      </div>
    </div>
  );
}
