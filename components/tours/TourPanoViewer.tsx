"use client";

import { useRef, useEffect } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

interface TourPanoViewerProps {
  src: string;
  initialYaw?: number;
  initialPitch?: number;
  onPositionChange?: (yaw: number, pitch: number) => void;
  /** Fired on the library's own "panorama-error" event (e.g. the image failed to load). Optional
   *  and additive — existing callers that don't pass it are unaffected. */
  onError?: () => void;
}

export function TourPanoViewer({
  src,
  initialYaw = 0,
  initialPitch = 0,
  onPositionChange,
  onError,
}: TourPanoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: src,
      defaultYaw: `${initialYaw}deg`,
      defaultPitch: `${initialPitch}deg`,
      navbar: ["zoom", "move", "fullscreen"],
      loadingTxt: "Loading panorama…",
    });

    if (onPositionChange) {
      viewer.addEventListener("position-updated", ({ position }) => {
        onPositionChange(
          Math.round((position.yaw * 180) / Math.PI),
          Math.round((position.pitch * 180) / Math.PI),
        );
      });
    }

    if (onError) {
      viewer.addEventListener("panorama-error", () => onError());
    }

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [src, initialYaw, initialPitch, onPositionChange, onError]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-lg"
      style={{ minHeight: 400 }}
    />
  );
}
