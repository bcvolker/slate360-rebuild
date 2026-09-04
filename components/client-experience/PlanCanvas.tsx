"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import type { PlanSheet, PlanPoint, Station, Waypoint } from "@/lib/client-experience/types";

export type PlanItemMarker = PlanPoint & { id: string; label: string; status: string };

type Props = {
  sheet: PlanSheet;
  waypoints?: Waypoint[];
  stations?: Station[];
  items?: PlanItemMarker[];
  /** Approximate current position of the walkthrough (fractions) + heading in plan degrees. */
  position?: { u: number; v: number; heading: number } | null;
  selectedStationId?: string | null;
  selectedItemId?: string | null;
  /** Fractions of the sheet to centre on when first shown (falls back to sheet focus). */
  focusPoint?: PlanPoint | null;
  onWaypoint?: (w: Waypoint) => void;
  onStation?: (s: Station) => void;
  onItem?: (id: string) => void;
  showLegend?: boolean;
  className?: string;
};

type View = { x: number; y: number; k: number };

export function PlanCanvas({ sheet, waypoints = [], stations = [], items = [], position, selectedStationId, selectedItemId, focusPoint, onWaypoint, onStation, onItem, showLegend = true, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0.3 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const W = sheet.width, H = sheet.height;

  const fit = useCallback((region: { u0: number; v0: number; u1: number; v1: number }, pad = 24) => {
    const host = hostRef.current;
    if (!host) return;
    const bw = host.clientWidth, bh = host.clientHeight;
    if (bw < pad * 3 || bh < pad * 3) return; // not laid out yet (hidden panel)
    const rw = (region.u1 - region.u0) * W, rh = (region.v1 - region.v0) * H;
    const k = Math.max(0.05, Math.min((bw - pad * 2) / rw, (bh - pad * 2) / rh));
    const cx = (region.u0 + region.u1) / 2 * W, cy = (region.v0 + region.v1) / 2 * H;
    setView({ k, x: bw / 2 - cx * k, y: bh / 2 - cy * k });
  }, [W, H]);

  const fitFocus = useCallback(() => {
    if (focusPoint) {
      const span = 0.16;
      fit({ u0: focusPoint.u - span / 2, v0: focusPoint.v - span / 2 * (W / H), u1: focusPoint.u + span / 2, v1: focusPoint.v + span / 2 * (W / H) });
    } else fit(sheet.focus);
  }, [fit, focusPoint, sheet.focus, W, H]);

  useEffect(() => {
    fitFocus();
    const settle = window.setTimeout(fitFocus, 400); // panel slide-in / late layout
    const ro = new ResizeObserver(() => fitFocus());
    if (hostRef.current) ro.observe(hostRef.current);
    return () => { window.clearTimeout(settle); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id, focusPoint?.u, focusPoint?.v]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    setView((v) => {
      const host = hostRef.current;
      const cx = px ?? (host?.clientWidth ?? 0) / 2, cy = py ?? (host?.clientHeight ?? 0) / 2;
      const k = Math.min(3, Math.max(0.08, v.k * factor));
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [zoomAt]);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = () => { drag.current = null; };
  const clickable = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); if (!drag.current?.moved) fn(); };

  const path = useMemo(() => waypoints.map((w, i) => `${i ? "L" : "M"}${(w.u * W).toFixed(1)},${(w.v * H).toFixed(1)}`).join(" "), [waypoints, W, H]);
  const s = 1 / view.k; // keep marker sizes constant on screen

  return (
    <div ref={hostRef} className={`ce-plan${className ? ` ${className}` : ""}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} data-testid="ce-plan">
      <div className="ce-plan__layer" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, width: W, height: H }}>
        <img src={sheet.imageUrl} width={W} height={H} alt={`${sheet.sheetNumber} ${sheet.title}`} draggable={false} />
        <svg className="ce-plan__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {path ? (
            <>
              <path d={path} fill="none" stroke="var(--graphite-canvas)" strokeWidth={5 * s} strokeOpacity={0.9} strokeLinejoin="round" strokeLinecap="round" />
              <path d={path} fill="none" stroke="white" strokeWidth={2 * s} strokeDasharray={`${6 * s} ${6 * s}`} strokeLinejoin="round" strokeLinecap="round" />
            </>
          ) : null}
          {waypoints.map((w) => (
            <g key={w.id} transform={`translate(${w.u * W},${w.v * H})`} onClick={clickable(() => onWaypoint?.(w))} style={{ cursor: "pointer" }}>
              <circle r={11 * s} fill="transparent" />
              <circle r={4.5 * s} fill="var(--graphite-canvas)" stroke="white" strokeWidth={1.5 * s} />
            </g>
          ))}
          {stations.map((st) => {
            const sel = st.id === selectedStationId;
            return (
              <g key={st.id} transform={`translate(${st.u * W},${st.v * H})`} onClick={clickable(() => onStation?.(st))} style={{ cursor: "pointer" }}>
                <circle r={14 * s} fill="transparent" />
                <circle r={sel ? 9 * s : 7 * s} fill={sel ? "var(--ce-accent)" : "var(--ce-accent)"} fillOpacity={sel ? 1 : 0.85} stroke="var(--graphite-canvas)" strokeWidth={1.5 * s} />
                <circle r={2.2 * s} fill="var(--graphite-canvas)" />
                {sel ? <circle r={15 * s} fill="none" stroke="var(--ce-accent)" strokeWidth={1.5 * s} strokeOpacity={0.7} /> : null}
              </g>
            );
          })}
          {items.map((it) => {
            const sel = it.id === selectedItemId;
            return (
              <g key={it.id} transform={`translate(${it.u * W},${it.v * H})`} onClick={clickable(() => onItem?.(it.id))} style={{ cursor: "pointer" }}>
                <rect x={-7 * s} y={-7 * s} width={14 * s} height={14 * s} rx={2 * s} transform="rotate(45)" fill={sel ? "var(--ce-accent)" : "white"} stroke="var(--graphite-canvas)" strokeWidth={1.6 * s} />
              </g>
            );
          })}
          {position ? (
            <g transform={`translate(${position.u * W},${position.v * H}) rotate(${position.heading})`}>
              <circle r={22 * s} fill="var(--ce-accent)" fillOpacity={0.14} />
              <path d={`M${-7 * s},${-8 * s} L${13 * s},0 L${-7 * s},${8 * s} Z`} fill="var(--ce-accent)" stroke="var(--graphite-canvas)" strokeWidth={1.5 * s} strokeLinejoin="round" />
            </g>
          ) : null}
        </svg>
      </div>
      <div className="ce-plan__sheet">{sheet.sheetNumber} · {sheet.title}</div>
      <div className="ce-plan__tools">
        <button type="button" className="ce-btn ce-btn--icon" onClick={() => zoomAt(1.3)} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" className="ce-btn ce-btn--icon" onClick={() => zoomAt(1 / 1.3)} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" className="ce-btn ce-btn--icon" onClick={() => fit(sheet.focus)} aria-label="Fit to room"><Scan size={16} /></button>
      </div>
      {showLegend ? (
        <div className="ce-plan__legend">
          {waypoints.length ? <span><i style={{ background: "white", outline: "1.5px solid var(--graphite-canvas)" }} />Walk path</span> : null}
          {stations.length ? <span><i style={{ background: "var(--ce-accent)" }} />360 station</span> : null}
          {items.length ? <span><i style={{ background: "white", borderRadius: 2, transform: "rotate(45deg)" }} />Item</span> : null}
          {position ? <span><i style={{ background: "var(--ce-accent)", borderRadius: 2 }} />You (approx.)</span> : null}
        </div>
      ) : null}
    </div>
  );
}
