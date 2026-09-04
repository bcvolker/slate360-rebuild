"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import type { PlanSheet, PlanPoint, Station, Waypoint } from "@/lib/client-experience/types";

export type PlanItemMarker = PlanPoint & { id: string; label: string; status: string; kind?: "item" | "question" };
type Layer = "path" | "stations" | "items" | "you";

type Props = {
  sheet: PlanSheet;
  waypoints?: Waypoint[];
  stations?: Station[];
  items?: PlanItemMarker[];
  position?: { u: number; v: number; heading: number } | null;
  selectedStationId?: string | null;
  selectedItemId?: string | null;
  focusPoint?: PlanPoint | null;
  onWaypoint?: (w: Waypoint) => void;
  onStation?: (s: Station) => void;
  onItem?: (id: string) => void;
  className?: string;
};

type View = { x: number; y: number; k: number };

/** Pan/zoom construction sheet with a restrained overlay: path (segment-aware), stations, items, current location. */
export function PlanCanvas({ sheet, waypoints = [], stations = [], items = [], position, selectedStationId, selectedItemId, focusPoint, onWaypoint, onStation, onItem, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0.3 });
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ path: true, stations: true, items: true, you: true });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const W = sheet.width, H = sheet.height;

  const fit = useCallback((region: { u0: number; v0: number; u1: number; v1: number }, pad = 24) => {
    const host = hostRef.current; if (!host) return;
    const bw = host.clientWidth, bh = host.clientHeight;
    if (bw < pad * 3 || bh < pad * 3) return;
    const rw = (region.u1 - region.u0) * W, rh = (region.v1 - region.v0) * H;
    const k = Math.max(0.05, Math.min((bw - pad * 2) / rw, (bh - pad * 2) / rh));
    const cx = ((region.u0 + region.u1) / 2) * W, cy = ((region.v0 + region.v1) / 2) * H;
    setView({ k, x: bw / 2 - cx * k, y: bh / 2 - cy * k });
  }, [W, H]);
  const fitFocus = useCallback(() => {
    if (focusPoint) { const s = 0.16; fit({ u0: focusPoint.u - s / 2, v0: focusPoint.v - (s / 2) * (W / H), u1: focusPoint.u + s / 2, v1: focusPoint.v + (s / 2) * (W / H) }); }
    else fit(sheet.focus);
  }, [fit, focusPoint, sheet.focus, W, H]);
  useEffect(() => {
    fitFocus();
    const settle = window.setTimeout(fitFocus, 400);
    const ro = new ResizeObserver(() => fitFocus());
    if (hostRef.current) ro.observe(hostRef.current);
    return () => { window.clearTimeout(settle); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id, focusPoint?.u, focusPoint?.v]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    setView((v) => {
      const host = hostRef.current;
      const cx = px ?? (host?.clientWidth ?? 0) / 2, cy = py ?? (host?.clientHeight ?? 0) / 2;
      const k = Math.min(3, Math.max(0.08, v.k * factor)), r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  }, []);
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const r = host.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [zoomAt]);
  const onPointerDown = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; };
  const onPointerMove = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true; setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy })); };
  const onPointerUp = () => { drag.current = null; };
  const clickable = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); if (!drag.current?.moved) fn(); };

  // One polyline per recorded segment — never a line across a break.
  const paths = useMemo(() => {
    const groups = new Map<string, Waypoint[]>();
    for (const w of waypoints) groups.set(w.segmentId, [...(groups.get(w.segmentId) ?? []), w]);
    return [...groups.values()].map((g) => g.map((w, i) => `${i ? "L" : "M"}${(w.u * W).toFixed(1)},${(w.v * H).toFixed(1)}`).join(" "));
  }, [waypoints, W, H]);
  const s = 1 / view.k;
  const toggle = (l: Layer) => setLayers((v) => ({ ...v, [l]: !v[l] }));

  return (
    <div ref={hostRef} className={`ce-plan${className ? ` ${className}` : ""}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} data-testid="ce-plan">
      <div className="ce-plan__layer" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, width: W, height: H }}>
        <img src={sheet.imageUrl} width={W} height={H} alt={`${sheet.sheetNumber} ${sheet.title}`} draggable={false} />
        <svg className="ce-plan__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {layers.path ? paths.map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--graphite-canvas)" strokeWidth={3.2 * s} strokeOpacity={0.55} strokeLinejoin="round" strokeLinecap="round" />
              <path d={d} fill="none" stroke="var(--ce-accent)" strokeWidth={1.6 * s} strokeOpacity={0.9} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )) : null}
          {layers.path ? waypoints.map((w) => (
            <g key={w.id} transform={`translate(${w.u * W},${w.v * H})`} onClick={clickable(() => onWaypoint?.(w))} style={{ cursor: "pointer" }}>
              <circle r={11 * s} fill="transparent" />
              <circle r={3.2 * s} fill="var(--ce-accent)" stroke="var(--graphite-canvas)" strokeWidth={1.2 * s} />
            </g>
          )) : null}
          {layers.stations ? stations.map((st) => { const sel = st.id === selectedStationId; return (
            <g key={st.id} transform={`translate(${st.u * W},${st.v * H})`} onClick={clickable(() => onStation?.(st))} style={{ cursor: "pointer" }}>
              <circle r={14 * s} fill="transparent" />
              <circle r={sel ? 8 * s : 6 * s} fill="white" stroke={sel ? "var(--ce-accent)" : "var(--graphite-canvas)"} strokeWidth={(sel ? 2.4 : 1.6) * s} />
              <circle r={2.4 * s} fill={sel ? "var(--ce-accent)" : "var(--graphite-canvas)"} />
            </g>
          ); }) : null}
          {layers.items ? items.map((it) => { const sel = it.id === selectedItemId; return (
            <g key={it.id} transform={`translate(${it.u * W},${it.v * H})`} onClick={clickable(() => onItem?.(it.id))} style={{ cursor: "pointer" }}>
              <circle r={13 * s} fill="transparent" />
              {it.kind === "question"
                ? <circle r={6 * s} fill={sel ? "var(--ce-accent)" : "var(--graphite-canvas)"} stroke="white" strokeWidth={1.6 * s} />
                : <rect x={-6 * s} y={-6 * s} width={12 * s} height={12 * s} rx={1.5 * s} transform="rotate(45)" fill={sel ? "var(--ce-accent)" : "var(--graphite-canvas)"} stroke="white" strokeWidth={1.6 * s} />}
            </g>
          ); }) : null}
          {layers.you && position ? (
            <g transform={`translate(${position.u * W},${position.v * H}) rotate(${position.heading})`}>
              <circle r={13 * s} fill="var(--ce-accent)" fillOpacity={0.18} />
              <path d={`M${-4.5 * s},${-5 * s} L${8 * s},0 L${-4.5 * s},${5 * s} Z`} fill="var(--ce-accent)" stroke="var(--graphite-canvas)" strokeWidth={1.2 * s} strokeLinejoin="round" />
            </g>
          ) : null}
        </svg>
      </div>
      <div className="ce-plan__sheet"><span className="ce-code" style={{ color: "var(--ce-ink)" }}>{sheet.sheetNumber}</span><span>{sheet.title}</span></div>
      <div className="ce-plan__tools">
        <button type="button" className="ce-btn ce-btn--icon" onClick={() => zoomAt(1.3)} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" className="ce-btn ce-btn--icon" onClick={() => zoomAt(1 / 1.3)} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" className="ce-btn ce-btn--icon" onClick={() => fit(sheet.focus)} aria-label="Fit to room"><Scan size={16} /></button>
      </div>
      <div className="ce-layers" role="group" aria-label="Plan layers">
        {waypoints.length ? <button type="button" className="ce-layers__btn" aria-pressed={layers.path} onClick={() => toggle("path")}><i style={{ color: "var(--ce-accent)" }} />Path</button> : null}
        {stations.length ? <button type="button" className="ce-layers__btn" aria-pressed={layers.stations} onClick={() => toggle("stations")}><i style={{ color: "white" }} />Stations</button> : null}
        {items.length ? <button type="button" className="ce-layers__btn" aria-pressed={layers.items} onClick={() => toggle("items")}><i style={{ color: "var(--ce-ink)", borderRadius: 2 }} />Items</button> : null}
        {position ? <button type="button" className="ce-layers__btn" aria-pressed={layers.you} onClick={() => toggle("you")}><i style={{ color: "var(--ce-accent)", borderRadius: 2 }} />You</button> : null}
      </div>
    </div>
  );
}
