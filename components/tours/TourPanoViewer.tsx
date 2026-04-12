"use client";

import { useRef, useEffect } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

interface TourPanoViewerProps {
  src: string;
  initialYaw?: number;
  initialPitch?: number;
  onPositionChange?: (yaw: number, pitch: number) => void;
}

export function TourPanoViewer({
  src,
  initialYaw = 0,
  initialPitch = 0,
  onPositionChange,
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

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [src, initialYaw, initialPitch, onPositionChange]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-lg"
      style={{ minHeight: 400 }}
    />
  );
}
