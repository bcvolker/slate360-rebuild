"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import type { ProjectItem, Station } from "@/lib/client-experience/types";

export type StationViewerHandle = {
  look: (yaw: number, pitch: number) => void;
  zoom: (delta: number) => void;
  getView: () => { yaw: number; pitch: number };
};

type Props = {
  station: Station;
  stations: Station[];
  items: ProjectItem[];
  selectedItemId?: string | null;
  initial?: { yaw?: number; pitch?: number };
  onNavigate: (stationId: string) => void;
  onItemSelect?: (id: string) => void;
  onView?: (v: { yaw: number; pitch: number }) => void;
};

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';

/** High-resolution 360 station with adjacent-station arrows and item pins. */
export const StationViewer = forwardRef<StationViewerHandle, Props>(function StationViewer(
  { station, stations, items, selectedItemId, initial, onNavigate, onItemSelect, onView },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const readyRef = useRef(false);
  const live = useRef({ onNavigate, onItemSelect, onView });
  live.current = { onNavigate, onItemSelect, onView };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const viewer = new Viewer({
      container: host,
      panorama: station.imageUrl,
      navbar: false,
      defaultYaw: `${initial?.yaw ?? 0}deg`,
      defaultPitch: `${initial?.pitch ?? 0}deg`,
      defaultZoomLvl: 30,
      minFov: 35,
      maxFov: 100,
      mousewheel: true,
      touchmoveTwoFingers: false,
      keyboard: false,
      loadingTxt: "",
      plugins: [MarkersPlugin],
    });
    viewerRef.current = viewer;
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    markers.addEventListener("select-marker", (e) => {
      const d = e.marker.data as { kind: string; id: string } | undefined;
      if (d?.kind === "station") live.current.onNavigate(d.id);
      if (d?.kind === "item") live.current.onItemSelect?.(d.id);
    });
    viewer.addEventListener("position-updated", () => {
      const p = viewer.getPosition();
      live.current.onView?.({ yaw: (p.yaw * 180) / Math.PI, pitch: (p.pitch * 180) / Math.PI });
    });
    readyRef.current = false;
    viewer.addEventListener("ready", () => { readyRef.current = true; }, { once: true });
    return () => { viewer.destroy(); viewerRef.current = null; readyRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    let cancelled = false;
    // First image is the one the viewer was constructed with: wait for it rather than re-issuing a load.
    const swap = readyRef.current
      ? viewer.setPanorama(station.imageUrl, { transition: { speed: 600, rotation: false }, showLoader: false, position: initial?.yaw != null && initial?.pitch != null ? { yaw: `${initial.yaw}deg`, pitch: `${initial.pitch}deg` } : undefined }).then(() => undefined)
      : new Promise<void>((resolve) => viewer.addEventListener("ready", () => resolve(), { once: true }));
    void swap.then(() => {
      if (cancelled || viewerRef.current !== viewer) return;
      const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      const defs: Parameters<MarkersPlugin["setMarkers"]>[0] = [];
      for (const n of station.neighbors) {
        const target = stations.find((s) => s.id === n.id);
        if (!target) continue;
        defs.push({
          id: `st:${n.id}`,
          position: { yaw: `${n.yawDeg}deg`, pitch: "-24deg" },
          html: `<div class="ce-station-arrow" title="${target.label}" style="transform: rotate(0deg)">${ARROW}</div>`,
          size: { width: 44, height: 44 },
          anchor: "center center",
          data: { kind: "station", id: n.id },
        });
      }
      for (const it of items) {
        const r = it.refs.find((x) => x.kind === "station" && x.stationId === station.id);
        if (!r || r.kind !== "station") continue;
        defs.push({
          id: `item:${it.id}`,
          position: { yaw: `${r.yaw}deg`, pitch: `${r.pitch}deg` },
          html: `<div class="ce-pin-marker${it.id === selectedItemId ? " is-selected" : ""}"><i></i>${it.title}</div>`,
          anchor: "center left",
          data: { kind: "item", id: it.id },
        });
      }
      markers.setMarkers(defs);
    });
    return () => { cancelled = true; };
  }, [station, stations, items, selectedItemId, initial?.yaw, initial?.pitch]);

  useImperativeHandle(ref, () => ({
    look: (yaw, pitch) => { void viewerRef.current?.animate({ yaw: `${yaw}deg`, pitch: `${pitch}deg`, speed: "3rpm" }); },
    zoom: (delta) => { const vw = viewerRef.current; if (vw) vw.zoom(vw.getZoomLevel() + delta); },
    getView: () => { const p = viewerRef.current?.getPosition(); return { yaw: p ? (p.yaw * 180) / Math.PI : 0, pitch: p ? (p.pitch * 180) / Math.PI : 0 }; },
  }), []);

  return <div ref={hostRef} className="ce-viewer__stage" style={{ cursor: "grab" }} data-testid="ce-station-stage" />;
});
