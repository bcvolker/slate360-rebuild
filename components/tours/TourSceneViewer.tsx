"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

export type SceneView = { yaw: number; pitch: number; zoom: number };

export type TourSceneViewerHandle = {
  /** Current camera view — degrees for yaw/pitch, 0–100 for zoom. */
  getView: () => SceneView | null;
};

type Props = {
  /** A resolved, displayable URL (signed GET), NOT a raw S3 key. */
  src: string;
  initialYaw?: number; // degrees
  initialPitch?: number; // degrees
  initialZoom?: number; // 0–100
  /** Keep-out limits: clamps the camera so the viewer can't look at hidden areas. */
  minFov?: number;
  maxFov?: number;
};

const rad2deg = (r: number) => Math.round((r * 180) / Math.PI);

/**
 * Authoring/preview panorama viewer. Exposes getView() so the workspace can implement
 * one-click "Set as start view" — the author just drags the pano to the angle+zoom they
 * want and clicks; we read the current view verbatim.
 */
export const TourSceneViewer = forwardRef<TourSceneViewerHandle, Props>(function TourSceneViewer(
  { src, initialYaw = 0, initialPitch = 0, initialZoom, minFov, maxFov },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useImperativeHandle(ref, () => ({
    getView: () => {
      const v = viewerRef.current;
      if (!v) return null;
      const pos = v.getPosition();
      return { yaw: rad2deg(pos.yaw), pitch: rad2deg(pos.pitch), zoom: Math.round(v.getZoomLevel()) };
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new Viewer({
      container: containerRef.current,
      panorama: src,
      defaultYaw: `${initialYaw}deg`,
      defaultPitch: `${initialPitch}deg`,
      ...(typeof initialZoom === "number" ? { defaultZoomLvl: initialZoom } : {}),
      ...(typeof minFov === "number" ? { minFov } : {}),
      ...(typeof maxFov === "number" ? { maxFov } : {}),
      navbar: ["zoom", "move", "fullscreen"],
      loadingTxt: "Loading panorama…",
    });
    viewerRef.current = viewer;
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
    // Re-init when the source changes; view props are seeds, not live-bound.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg bg-black" style={{ minHeight: 320 }} />;
});
