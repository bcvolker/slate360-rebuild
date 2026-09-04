"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { EquirectangularVideoAdapter } from "@photo-sphere-viewer/equirectangular-video-adapter";
import { VideoPlugin } from "@photo-sphere-viewer/video-plugin";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/video-plugin/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import type { ProjectItem, Waypoint } from "@/lib/client-experience/types";
import { nextWaypointFor } from "@/lib/client-experience/utils";

export type WalkView = { t: number; yaw: number; pitch: number };
export type WalkViewerHandle = {
  play: () => void;
  pause: () => void;
  seek: (t: number, yaw?: number, pitch?: number) => void;
  look: (yaw: number, pitch: number) => void;
  zoom: (delta: number) => void;
  getView: () => WalkView;
};

type Props = {
  videoUrl: string;
  posterUrl: string;
  waypoints: Waypoint[];
  items: ProjectItem[];
  selectedItemId?: string | null;
  showNavMarkers: boolean;
  showItemMarkers: boolean;
  initial?: Partial<WalkView>;
  onTime?: (t: number) => void;
  onView?: (v: WalkView) => void;
  onPlayState?: (playing: boolean) => void;
  onReady?: () => void;
  onItemSelect?: (id: string) => void;
};

const FWD_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
const BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';

/**
 * Thin Photo Sphere Viewer wrapper for the continuous walkthrough. Owns the
 * sphere only; all chrome lives in WalkExperience. Navigation markers are
 * derived from the waypoint path and the current viewing direction.
 */
export const WalkViewer = forwardRef<WalkViewerHandle, Props>(function WalkViewer(
  { videoUrl, posterUrl, waypoints, items, selectedItemId, showNavMarkers, showItemMarkers, initial, onTime, onView, onPlayState, onReady, onItemSelect },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const live = useRef({ waypoints, items, selectedItemId, showNavMarkers, showItemMarkers, onTime, onView, onPlayState, onItemSelect });
  live.current = { waypoints, items, selectedItemId, showNavMarkers, showItemMarkers, onTime, onView, onPlayState, onItemSelect };

  const refreshMarkers = () => {
    const viewer = viewerRef.current;
    const video = videoRef.current;
    if (!viewer || !video) return;
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    const pos = viewer.getPosition();
    const yaw = (pos.yaw * 180) / Math.PI;
    const t = video.currentTime;
    const defs: Parameters<MarkersPlugin["setMarkers"]>[0] = [];
    const L = live.current;
    if (L.showNavMarkers) {
      const nav = nextWaypointFor(L.waypoints, t, yaw);
      if (nav) {
        const fwd = nav.direction === "forward";
        defs.push({
          id: "nav",
          position: { yaw: `${fwd ? 0 : 180}deg`, pitch: "-22deg" },
          html: `<div class="ce-nav-marker" title="${fwd ? "Continue to" : "Back to"} ${nav.target.label}">${fwd ? FWD_SVG : BACK_SVG}</div>`,
          size: { width: 56, height: 56 },
          anchor: "center center",
          data: { kind: "nav", t: nav.target.t },
        });
      }
    }
    if (L.showItemMarkers) {
      for (const it of L.items) {
        const r = it.refs.find((x) => x.kind === "walkthrough");
        if (!r || r.kind !== "walkthrough" || Math.abs(r.t - t) > 6) continue;
        defs.push({
          id: `item:${it.id}`,
          position: { yaw: `${r.yaw}deg`, pitch: `${r.pitch}deg` },
          html: `<div class="ce-pin-marker${it.id === L.selectedItemId ? " is-selected" : ""}"><i></i>${it.title}</div>`,
          anchor: "center left",
          data: { kind: "item", id: it.id },
        });
      }
    }
    markers.setMarkers(defs);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.preload = "auto";
    video.poster = posterUrl;
    video.src = videoUrl;
    videoRef.current = video;
    const viewer = new Viewer({
      container: host,
      adapter: EquirectangularVideoAdapter,
      panorama: { source: video },
      navbar: false,
      defaultYaw: `${initial?.yaw ?? 0}deg`,
      defaultPitch: `${initial?.pitch ?? 0}deg`,
      defaultZoomLvl: 30,
      minFov: 40,
      maxFov: 100,
      moveSpeed: 1.3,
      mousewheel: true,
      touchmoveTwoFingers: false,
      keyboard: false,
      loadingTxt: "",
      plugins: [[VideoPlugin, { progressbar: false, bigbutton: false }], MarkersPlugin],
    });
    viewerRef.current = viewer;
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    markers.addEventListener("select-marker", (e) => {
      const d = e.marker.data as { kind: string; t?: number; id?: string } | undefined;
      if (d?.kind === "nav" && typeof d.t === "number") {
        video.currentTime = d.t;
        void video.play().catch(() => undefined);
      } else if (d?.kind === "item" && d.id) live.current.onItemSelect?.(d.id);
    });
    const onTimeUpdate = () => { live.current.onTime?.(video.currentTime); refreshMarkers(); };
    const onPlay = () => live.current.onPlayState?.(true);
    const onPause = () => live.current.onPlayState?.(false);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    viewer.addEventListener("position-updated", () => {
      const p = viewer.getPosition();
      live.current.onView?.({ t: video.currentTime, yaw: (p.yaw * 180) / Math.PI, pitch: (p.pitch * 180) / Math.PI });
      refreshMarkers();
    });
    viewer.addEventListener("ready", () => {
      if (initial?.t) video.currentTime = initial.t;
      onReady?.();
      refreshMarkers();
    }, { once: true });
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      viewer.destroy();
      video.removeAttribute("src");
      video.load();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  useEffect(() => { refreshMarkers(); }, [showNavMarkers, showItemMarkers, selectedItemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    play: () => { void videoRef.current?.play().catch(() => undefined); },
    pause: () => videoRef.current?.pause(),
    seek: (t, yaw, pitch) => {
      const v = videoRef.current;
      if (v) v.currentTime = t;
      if (yaw != null && pitch != null) void viewerRef.current?.animate({ yaw: `${yaw}deg`, pitch: `${pitch}deg`, speed: "3rpm" });
      refreshMarkers();
    },
    look: (yaw, pitch) => { void viewerRef.current?.animate({ yaw: `${yaw}deg`, pitch: `${pitch}deg`, speed: "3rpm" }); },
    zoom: (delta) => { const vw = viewerRef.current; if (vw) vw.zoom(vw.getZoomLevel() + delta); },
    getView: () => {
      const p = viewerRef.current?.getPosition();
      return { t: videoRef.current?.currentTime ?? 0, yaw: p ? (p.yaw * 180) / Math.PI : 0, pitch: p ? (p.pitch * 180) / Math.PI : 0 };
    },
  }), []);

  return <div ref={hostRef} className="ce-viewer__stage" style={{ cursor: "grab" }} data-testid="ce-walk-stage" />;
});
