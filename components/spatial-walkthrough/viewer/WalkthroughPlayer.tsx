"use client";

import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { EquirectangularVideoAdapter } from "@photo-sphere-viewer/equirectangular-video-adapter";
import { VideoPlugin } from "@photo-sphere-viewer/video-plugin";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import { VisibleRangePlugin } from "@photo-sphere-viewer/visible-range-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/video-plugin/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import "./walkthrough-markers.css";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { applySkip, skipIntervals, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import { buildViewerMarkers, type MarkerChrome, type PinMarkerInput } from "@/lib/spatial-walkthrough/markers";
import { operatorKeyframesFromRaw, resolvePatchAtTime } from "@/lib/spatial-walkthrough/housewalk-operator";
import { attachVisibleRangeSync } from "@/lib/spatial-walkthrough/viewer-visible-range";
import { attachPlayerRuntime } from "./player-runtime";

export type WalkthroughPlayerHandle = {
  seekTo: (t: number, yaw?: number, pitch?: number, opts?: { pause?: boolean }) => void;
  getView: () => { t: number; yaw: number; pitch: number };
  pause: () => void;
  play: () => void;
  setSourceMuted: (muted: boolean) => void;
  setSourceVolume: (volume: number) => void;
  isPaused: () => boolean;
  setPlaybackRate: (rate: number) => void;
  setSphereCorrection: (c: { pan: string; tilt: string; roll: string }) => void;
  viewerToSphere: (x: number, y: number) => { yaw: number; pitch: number } | null;
  zoomBy?: (delta: number) => void;
};

type Props = {
  videoUrl: string;
  posterUrl?: string | null;
  waypoints: WaypointRecord[];
  clipId: string;
  pins?: PinMarkerInput[];
  redactions?: RedactionRule[];
  operatorPatch?: OperatorPatch | null;
  theme?: BrandTheme | null;
  chrome?: MarkerChrome;
  selectedId?: string | null;
  autoplay?: boolean;
  autoRotate?: boolean;
  hudOpacity?: number;
  onPinSelect?: (id: string) => void;
  onWaypointSelect?: () => void;
  onReady?: (handle: WalkthroughPlayerHandle) => void;
  onPlaying?: () => void;
  onPause?: () => void;
  onFirstFrame?: () => void;
  restrictView?: boolean;
  showOperatorOverlay?: boolean;
};

export function WalkthroughPlayer({
  videoUrl,
  posterUrl,
  waypoints,
  clipId,
  pins = [],
  redactions = [],
  operatorPatch,
  theme = null,
  chrome,
  selectedId = null,
  autoplay: _autoplay = false,
  autoRotate = true,
  hudOpacity = 1,
  onPinSelect,
  onWaypointSelect,
  onReady,
  onPlaying,
  onPause,
  onFirstFrame,
  restrictView = false,
  showOperatorOverlay = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinSelectRef = useRef(onPinSelect);
  const waypointRef = useRef(onWaypointSelect);
  const readyRef = useRef(onReady);
  const playingRef = useRef(onPlaying);
  const pauseCbRef = useRef(onPause);
  const firstFrameRef = useRef(onFirstFrame);
  pinSelectRef.current = onPinSelect;
  waypointRef.current = onWaypointSelect;
  readyRef.current = onReady;
  playingRef.current = onPlaying;
  pauseCbRef.current = onPause;
  firstFrameRef.current = onFirstFrame;

  const liveRef = useRef({ waypoints, clipId, pins, redactions, operatorPatch, theme, chrome, selectedId, hudOpacity, restrictView, showOperatorOverlay });
  liveRef.current = { waypoints, clipId, pins, redactions, operatorPatch, theme, chrome, selectedId, hudOpacity, restrictView, showOperatorOverlay };

  useEffect(() => {
    if (!containerRef.current) return;
    const video = document.createElement("video");
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.preload = "auto";
    if (posterUrl) video.poster = posterUrl;
    video.src = videoUrl;

    let viewer: Viewer;
    try {
      viewer = new Viewer({
      container: containerRef.current,
      adapter: EquirectangularVideoAdapter,
      panorama: { source: video },
      defaultYaw: "0deg",
      defaultPitch: restrictView ? "44deg" : "0deg",
      navbar: false,
      mousewheel: true,
      mousemove: true,
      mousewheelCtrlKey: false,
      moveSpeed: 1.5,
      zoomSpeed: 1.4,
      defaultZoomLvl: restrictView ? 72 : 50,
      minFov: 40,
      maxFov: restrictView ? 56 : 100,
      touchmoveTwoFingers: false,
      keyboard: "fullscreen",
      loadingImg: undefined,
      plugins: [
        [VideoPlugin, { progressbar: false, bigbutton: false }],
        MarkersPlugin,
        VisibleRangePlugin.withConfig({
          horizontalRange: restrictView ? ["-90deg", "90deg"] : undefined,
          verticalRange: restrictView ? ["42deg", "78deg"] : undefined,
        }),
      ],
    });
    } catch (err) {
      console.error("[WalkthroughPlayer] Viewer init failed", err);
      video.removeAttribute("src");
      video.load();
      return;
    }
    const videoPlugin = viewer.getPlugin(VideoPlugin) as VideoPlugin;
    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;

    const applyMarkers = (t: number) => {
      const live = liveRef.current;
      const defs = buildViewerMarkers({
        waypoints: live.waypoints,
        clipId: live.clipId,
        t,
        pins: live.pins,
        redactions: live.redactions,
        operatorPatch: resolvePatchAtTime(
          live.operatorPatch,
          operatorKeyframesFromRaw(live.operatorPatch),
          t,
        ),
        theme: live.theme,
        chrome: live.chrome,
        selectedId: live.selectedId,
        hudOpacity: live.hudOpacity,
        showOperatorOverlay: live.showOperatorOverlay,
      });
      markers.setMarkers(
        defs.map((d) => ({
          id: d.id,
          position: { yaw: `${d.yawDeg}deg`, pitch: `${d.pitchDeg}deg` },
          html: d.html,
          size: { width: d.width, height: d.height },
          anchor: "center center",
          data: d.data,
        })),
      );
    };

    const handle: WalkthroughPlayerHandle = {
      seekTo: (t, yaw, pitch, opts) => {
        if (opts?.pause !== false) videoPlugin.pause();
        videoPlugin.setTime(t);
        if (yaw != null && pitch != null) {
          void viewer.animate({ yaw: `${yaw}deg`, pitch: `${pitch}deg`, speed: "2.5rpm" });
        }
        applyMarkers(t);
      },
      getView: () => {
        const pos = viewer.getPosition();
        return {
          t: videoPlugin.getTime(),
          yaw: (pos.yaw * 180) / Math.PI,
          pitch: (pos.pitch * 180) / Math.PI,
        };
      },
      pause: () => videoPlugin.pause(),
      play: () => {
        void video.play().catch(() => undefined);
        videoPlugin.play();
      },
      setSourceMuted: (muted) => {
        video.muted = muted;
      },
      setSourceVolume: (volume) => {
        video.volume = Math.min(1, Math.max(0, volume));
      },
      isPaused: () => video.paused,
      setPlaybackRate: (rate) => {
        video.playbackRate = rate;
      },
      setSphereCorrection: (c) => {
        viewer.setOptions({ sphereCorrection: c });
      },
      viewerToSphere: (x, y) => {
        try {
          const pos = viewer.dataHelper.viewerCoordsToSphericalCoords({ x, y });
          return { yaw: (pos.yaw * 180) / Math.PI, pitch: (pos.pitch * 180) / Math.PI };
        } catch {
          return null;
        }
      },
      zoomBy: (delta) => {
        viewer.zoom(Math.min(100, Math.max(0, viewer.getZoomLevel() + delta)));
      },
    };

    const onProgress = (evt: { time?: number }) => {
      const live = liveRef.current;
      const raw = evt.time ?? videoPlugin.getTime();
      const skipped = applySkip(raw, skipIntervals(live.redactions, live.clipId));
      if (Math.abs(skipped - raw) > 0.08) {
        videoPlugin.setTime(skipped);
        return;
      }
      applyMarkers(raw);
    };

    const onSelect = (e: { marker?: { data?: { kind?: string; id?: string; t?: number; yaw?: number; pitch?: number } } }) => {
      const d = e.marker?.data;
      if (!d) return;
      if (d.kind === "waypoint" && d.t != null) {
        const resume = !video.paused;
        waypointRef.current?.();
        handle.seekTo(d.t, d.yaw, d.pitch, { pause: !resume });
        if (resume) handle.play();
      }
      if (d.kind === "pin" && d.id) {
        handle.pause();
        pinSelectRef.current?.(d.id);
      }
    };

    video.addEventListener("playing", () => playingRef.current?.());
    video.addEventListener("pause", () => pauseCbRef.current?.());
    const media = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (typeof media.requestVideoFrameCallback === "function") {
      media.requestVideoFrameCallback(() => firstFrameRef.current?.());
    } else {
      video.addEventListener("playing", () => firstFrameRef.current?.(), { once: true });
    }
    videoPlugin.addEventListener("progress", onProgress as never);
    markers.addEventListener("select-marker", onSelect as never);
    const detachRange = attachVisibleRangeSync(
      viewer,
      () => videoPlugin.getTime(),
      () => ({ restrictView: liveRef.current.restrictView, operatorPatch: liveRef.current.operatorPatch ?? null }),
      containerRef.current,
    );
    const detachRuntime = attachPlayerRuntime({
      container: containerRef.current,
      viewer,
      autoRotate: autoRotate && !restrictView,
      onTick: () => applyMarkers(videoPlugin.getTime()),
    });
    viewer.addEventListener("ready", () => {
      applyMarkers(0);
      readyRef.current?.(handle);
    });

    return () => {
      detachRange();
      detachRuntime();
      markers.removeEventListener("select-marker", onSelect as never);
      videoPlugin.removeEventListener("progress", onProgress as never);
      viewer.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [videoUrl, posterUrl, autoRotate, restrictView]);

  return (
    <div
      className="absolute inset-0 min-h-0 w-full cursor-grab overflow-hidden overscroll-none bg-[var(--sw-page,var(--graphite-canvas))] active:cursor-grabbing"
      onWheel={(e) => e.preventDefault()}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing" data-testid="sw-pano" />
    </div>
  );
}
