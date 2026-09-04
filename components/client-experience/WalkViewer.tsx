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
import { nextWaypointFor, pathAnchors, waypointAt } from "@/lib/client-experience/utils";
import { tapAdvance } from "@/lib/spatial-experience/tap-advance";

export type WalkView = { t: number; yaw: number; pitch: number };
export type WalkMode = "explore" | "play";
export type WalkViewerHandle = {
  setMode: (mode: WalkMode) => void;
  setRate: (rate: number) => void;
  seek: (t: number, yaw?: number, pitch?: number) => void;
  moveTo: (t: number) => void;
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
  pathVisible: boolean;
  pathOpacity: number;
  initial?: Partial<WalkView>;
  onTime?: (t: number) => void;
  onView?: (v: WalkView) => void;
  onPlayState?: (playing: boolean) => void;
  onReady?: () => void;
  onItemSelect?: (id: string) => void;
};

const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>';
const DEG = 180 / Math.PI;
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const heading = (a: Waypoint, b: Waypoint) => Math.atan2(b.v - a.v, b.u - a.u) * DEG;

/**
 * The walkthrough sphere. Explore is the default: the video sits paused and the
 * client moves by choosing the next recorded-path node (tap the lower scene or
 * the move ring). Play follows the route at 1×/1.5×/2× with free look-around.
 * Movement is always constrained to the captured path.
 */
export const WalkViewer = forwardRef<WalkViewerHandle, Props>(function WalkViewer(
  { videoUrl, posterUrl, waypoints, items, selectedItemId, pathVisible, pathOpacity, initial, onTime, onView, onPlayState, onReady, onItemSelect },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modeRef = useRef<WalkMode>("explore");
  const markerClick = useRef(false);
  const live = useRef({ waypoints, items, selectedItemId, pathVisible, pathOpacity, onTime, onView, onPlayState, onItemSelect });
  live.current = { waypoints, items, selectedItemId, pathVisible, pathOpacity, onTime, onView, onPlayState, onItemSelect };

  const moveTo = (t: number) => {
    const video = videoRef.current, fade = fadeRef.current;
    if (!video) return;
    const jump = Math.abs(t - video.currentTime) > 2.5;
    if (jump && fade) fade.classList.add("is-on");
    window.setTimeout(() => {
      video.currentTime = t;
      if (modeRef.current === "play") void video.play().catch(() => undefined);
      window.setTimeout(() => fade?.classList.remove("is-on"), 140);
    }, jump ? 180 : 0);
  };

  const refreshMarkers = () => {
    const viewer = viewerRef.current, video = videoRef.current;
    if (!viewer || !video) return;
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    const yaw = viewer.getPosition().yaw * DEG;
    const t = video.currentTime;
    const L = live.current;
    const defs: Parameters<MarkersPlugin["setMarkers"]>[0] = [];
    const nav = nextWaypointFor(L.waypoints, t, yaw);
    if (nav) {
      const fwd = nav.direction === "forward";
      defs.push({ id: "move", position: { yaw: `${fwd ? 0 : 180}deg`, pitch: "-24deg" }, html: `<div class="ce-move-ring${fwd ? "" : " ce-move-ring--back"}" title="${fwd ? "Move to" : "Back to"} ${nav.target.label}"></div>`, size: { width: 50, height: 50 }, anchor: "center center", data: { kind: "move", t: nav.target.t } });
    }
    if (L.pathVisible) {
      const cur = waypointAt(L.waypoints, t);
      const idx = cur ? L.waypoints.indexOf(cur) : -1;
      const ahead = L.waypoints.slice(idx + 1, idx + 5).filter((w) => !cur || w.segmentId === cur.segmentId);
      // Route cues sit beyond the move ring, rising toward the horizon as they get farther away;
      // yaw follows the plan heading change so a turn reads as a turn.
      let prev = cur ?? L.waypoints[0];
      const base = cur && ahead[0] ? heading(cur, ahead[0]) : 0;
      let turn = 0;
      ahead.forEach((w, k) => {
        turn += k === 0 ? 0 : wrap(heading(prev, w) - base) * 0.5;
        const size = 24 - k * 3;
        defs.push({ id: `hud:${w.id}`, position: { yaw: `${wrap(turn)}deg`, pitch: `${-17.5 + k * 3.2}deg` }, html: `<div class="ce-hud-chev" style="--ce-path-opacity:${L.pathOpacity};width:${size}px;height:${size}px">${CHEV}</div>`, size: { width: size, height: size }, anchor: "center center", data: { kind: "hud", t: w.t } });
        prev = w;
      });
    }
    for (const it of L.items) {
      const r = it.refs.find((x) => x.kind === "walkthrough");
      if (!r || r.kind !== "walkthrough" || Math.abs(r.t - t) > 6) continue;
      defs.push({ id: `item:${it.id}`, position: { yaw: `${r.yaw}deg`, pitch: `${r.pitch}deg` }, html: `<div class="ce-pin-marker${it.type === "question" ? " ce-pin-marker--question" : ""}${it.id === L.selectedItemId ? " is-selected" : ""}"><i></i>${it.title}</div>`, anchor: "center left", data: { kind: "item", id: it.id } });
    }
    markers.setMarkers(defs);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const video = document.createElement("video");
    video.playsInline = true; video.muted = true; video.preload = "auto"; video.poster = posterUrl; video.src = videoUrl;
    videoRef.current = video;
    const viewer = new Viewer({
      container: host, adapter: EquirectangularVideoAdapter, panorama: { source: video }, navbar: false,
      defaultYaw: `${initial?.yaw ?? 0}deg`, defaultPitch: `${initial?.pitch ?? 0}deg`, defaultZoomLvl: 30, minFov: 40, maxFov: 100,
      moveSpeed: 1.3, mousewheel: true, touchmoveTwoFingers: false, keyboard: false, loadingTxt: "",
      plugins: [[VideoPlugin, { progressbar: false, bigbutton: false }], MarkersPlugin],
    });
    viewerRef.current = viewer;
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    markers.addEventListener("select-marker", (e) => {
      markerClick.current = true;
      const d = e.marker.data as { kind: string; t?: number; id?: string } | undefined;
      if ((d?.kind === "move" || d?.kind === "hud") && typeof d.t === "number") moveTo(d.t);
      else if (d?.kind === "item" && d.id) live.current.onItemSelect?.(d.id);
    });
    // Tap-to-move: a click on the lower scene selects the next path node in that direction (Cursor's cone rule).
    viewer.addEventListener("click", (e) => {
      if (markerClick.current) { markerClick.current = false; return; }
      if (modeRef.current !== "explore" || e.data.pitch > -0.12) return;
      const view = viewer.getPosition();
      const res = tapAdvance(pathAnchors(live.current.waypoints), video.currentTime, view.yaw * DEG, e.data.yaw * DEG);
      if (res.kind === "one") moveTo(res.anchor.tSeconds);
      else if (res.kind === "branch") moveTo(res.anchors[0].tSeconds);
    });
    const onTimeUpdate = () => { live.current.onTime?.(video.currentTime); refreshMarkers(); };
    const onPlay = () => live.current.onPlayState?.(true);
    const onPause = () => live.current.onPlayState?.(false);
    video.addEventListener("timeupdate", onTimeUpdate); video.addEventListener("seeked", onTimeUpdate);
    video.addEventListener("play", onPlay); video.addEventListener("pause", onPause);
    viewer.addEventListener("position-updated", () => {
      const p = viewer.getPosition();
      live.current.onView?.({ t: video.currentTime, yaw: p.yaw * DEG, pitch: p.pitch * DEG });
      refreshMarkers();
    });
    viewer.addEventListener("ready", () => { if (initial?.t) video.currentTime = initial.t; onReady?.(); refreshMarkers(); }, { once: true });
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate); video.removeEventListener("seeked", onTimeUpdate);
      video.removeEventListener("play", onPlay); video.removeEventListener("pause", onPause);
      viewer.destroy(); video.removeAttribute("src"); video.load(); viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  useEffect(() => { refreshMarkers(); }, [pathVisible, pathOpacity, selectedItemId, items]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    setMode: (mode) => {
      modeRef.current = mode;
      const v = videoRef.current;
      if (!v) return;
      if (mode === "play") void v.play().catch(() => undefined); else v.pause();
    },
    setRate: (rate) => { if (videoRef.current) videoRef.current.playbackRate = rate; },
    seek: (t, yaw, pitch) => {
      const v = videoRef.current; if (v) v.currentTime = t;
      if (yaw != null && pitch != null) void viewerRef.current?.animate({ yaw: `${yaw}deg`, pitch: `${pitch}deg`, speed: "3rpm" });
      refreshMarkers();
    },
    moveTo,
    look: (yaw, pitch) => { void viewerRef.current?.animate({ yaw: `${yaw}deg`, pitch: `${pitch}deg`, speed: "3rpm" }); },
    zoom: (delta) => { const vw = viewerRef.current; if (vw) vw.zoom(vw.getZoomLevel() + delta); },
    getView: () => { const p = viewerRef.current?.getPosition(); return { t: videoRef.current?.currentTime ?? 0, yaw: p ? p.yaw * DEG : 0, pitch: p ? p.pitch * DEG : 0 }; },
  }), []);

  return (
    <>
      <div ref={hostRef} className="ce-viewer__stage" style={{ cursor: "grab" }} data-testid="ce-walk-stage" />
      <div ref={fadeRef} className="ce-viewer__fade" aria-hidden="true" />
    </>
  );
});
