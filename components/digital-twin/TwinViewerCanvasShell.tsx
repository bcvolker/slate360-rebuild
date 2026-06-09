"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TwinCommentsOverlay } from "@/components/digital-twin/TwinCommentsOverlay";
import {
  TwinViewerControlsOverlay,
  type TwinViewerCameraMode,
} from "@/components/digital-twin/TwinViewerControlsOverlay";
import type { SplatViewerHandle } from "@/components/digital-twin/splat-viewer-core";

type Props = {
  children: ReactNode;
  viewerRef: React.RefObject<SplatViewerHandle | null>;
  cameraMode: TwinViewerCameraMode;
  walkAvailable: boolean;
  onToggleCameraMode: () => void;
  commentsOpen: boolean;
  onToggleComments: () => void;
  commentCount: number;
  commentsTitle?: string;
  commentsContent: ReactNode;
  toast?: string | null;
  topHint?: ReactNode;
};

export function TwinViewerCanvasShell({
  children,
  viewerRef,
  cameraMode,
  walkAvailable,
  onToggleCameraMode,
  commentsOpen,
  onToggleComments,
  commentCount,
  commentsTitle,
  commentsContent,
  toast,
  topHint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
      return;
    }
    await el.requestFullscreen();
  }, []);

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--graphite-canvas)]">
      {children}

      <div className="pointer-events-none absolute inset-0 z-20">
        {topHint ? (
          <div className="pointer-events-auto absolute left-3 top-3 z-30 max-w-[min(100%,20rem)]">
            {topHint}
          </div>
        ) : null}

        <div className="pointer-events-auto absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2">
          <TwinViewerControlsOverlay
            cameraMode={cameraMode}
            walkAvailable={walkAvailable}
            isFullscreen={isFullscreen}
            onToggleCameraMode={onToggleCameraMode}
            onZoomIn={() => viewerRef.current?.zoomIn()}
            onZoomOut={() => viewerRef.current?.zoomOut()}
            onRecenter={() => viewerRef.current?.recenter()}
            onToggleFullscreen={() => void toggleFullscreen()}
          />
        </div>

        <div className="pointer-events-auto absolute right-3 top-3 z-30 md:bottom-auto md:top-1/2 md:-translate-y-1/2">
          <TwinCommentsOverlay
            open={commentsOpen}
            onToggle={onToggleComments}
            count={commentCount}
            title={commentsTitle}
          >
            {commentsContent}
          </TwinCommentsOverlay>
        </div>

        {toast ? (
          <p className="pointer-events-none absolute bottom-[5.5rem] left-1/2 z-30 max-w-[90%] -translate-x-1/2 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] px-3 py-1.5 text-center text-xs text-zinc-100 backdrop-blur-md">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}
