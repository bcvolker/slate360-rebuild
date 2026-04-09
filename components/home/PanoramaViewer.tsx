"use client";

import { useRef, useEffect } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

interface PanoramaViewerProps {
  src: string;
  caption?: string;
}

export default function PanoramaViewer({ src, caption }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    viewerRef.current = new Viewer({
      container: containerRef.current,
      panorama: src,
      defaultYaw: 0,
      defaultPitch: 0,
      navbar: false,
      loadingTxt: "",
    });

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [src]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
      {caption && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
          {caption}
        </p>
      )}
    </div>
  );
}
