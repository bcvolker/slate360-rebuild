"use client";

import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { EquirectangularTilesAdapter } from "@photo-sphere-viewer/equirectangular-tiles-adapter";
import "@photo-sphere-viewer/core/index.css";
import type { SceneRuntime } from "@/lib/types/tours";

/**
 * Public-viewer panorama renderer — consumes a fully signed SceneRuntime
 * (tiles preferred, single-image fallback otherwise). Separate from the
 * authoring TourPanoViewer.tsx (plain `src: string`) because the data shapes
 * are fundamentally different (many signed tile URLs vs one authenticated
 * image URL) and the authoring flow is working code that shouldn't be
 * disturbed by the public-viewer's tiles-adapter path.
 */
export function PublicTourPanoViewer({ scene }: { scene: SceneRuntime }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!scene.tiles && !scene.fallbackImageUrl) return;

    const viewer = scene.tiles
      ? new Viewer({
          container: containerRef.current,
          adapter: [EquirectangularTilesAdapter, {}],
          panorama: {
            width: scene.tiles.sourceWidth,
            height: scene.tiles.sourceHeight,
            cols: scene.tiles.cols,
            rows: scene.tiles.rows,
            tileSize: scene.tiles.tileSize,
            baseUrl: scene.tiles.baseUrl,
            tileUrl: (col: number, row: number) => scene.tiles!.tileUrls[row * scene.tiles!.cols + col],
          },
          defaultYaw: `${scene.initialYaw}deg`,
          defaultPitch: `${scene.initialPitch}deg`,
          navbar: ["zoom", "move", "fullscreen"],
          loadingTxt: "Loading panorama…",
        })
      : new Viewer({
          container: containerRef.current,
          panorama: scene.fallbackImageUrl!,
          defaultYaw: `${scene.initialYaw}deg`,
          defaultPitch: `${scene.initialPitch}deg`,
          navbar: ["zoom", "move", "fullscreen"],
          loadingTxt: "Loading panorama…",
        });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
    // Re-init on scene identity change; tiles/fallbackImageUrl are seeds, not live-bound.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  return <div ref={containerRef} className="h-full w-full bg-black" />;
}
