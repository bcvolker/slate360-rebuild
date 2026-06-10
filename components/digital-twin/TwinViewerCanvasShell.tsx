"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TwinCommentsOverlay } from "@/components/digital-twin/TwinCommentsOverlay";
import { TwinViewerControlsOverlay } from "@/components/digital-twin/TwinViewerControlsOverlay";
import type { SplatViewerHandle } from "@/components/digital-twin/splat-viewer-core";
import { useVisualViewportBottomInset } from "@/lib/hooks/useVisualViewportBottomInset";

type Props = {
  children: ReactNode;
  viewerRef: React.RefObject<SplatViewerHandle | null>;
  commentsOpen: boolean;
  onToggleComments: () => void;
  commentCount: number;
  commentsTitle?: string;
  commentsContent: ReactNode;
  toast?: string | null;
  topHint?: ReactNode;
  footerHint?: ReactNode;
};

const MOBILE_CONTROLS_OFFSET_PX = 16;

export function TwinViewerCanvasShell({
  children,
  viewerRef,
  commentsOpen,
  onToggleComments,
  commentCount,
  commentsTitle,
  commentsContent,
  toast,
  topHint,
  footerHint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewportBottomInset = useVisualViewportBottomInset();

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

  const mobileControlsBottom = `calc(env(safe-area-inset-bottom, 0px) + ${viewportBottomInset + MOBILE_CONTROLS_OFFSET_PX}px)`;
  const toastBottom = `calc(env(safe-area-inset-bottom, 0px) + ${viewportBottomInset + 72}px)`;

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--graphite-canvas)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {children}

      <div className="pointer-events-none absolute inset-0 z-20">
        {topHint ? (
          <div className="pointer-events-auto absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 max-w-[min(100%,18rem)]">
            {topHint}
          </div>
        ) : null}

        {footerHint ? (
          <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] left-3 z-20 max-w-[min(100%,16rem)] md:bottom-auto md:left-3 md:top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)]">
            {footerHint}
          </div>
        ) : null}

        <div
          className="pointer-events-auto absolute left-1/2 z-30 -translate-x-1/2 md:bottom-4 md:left-auto md:right-4 md:translate-x-0"
          style={{ bottom: mobileControlsBottom }}
        >
          <TwinViewerControlsOverlay
            isFullscreen={isFullscreen}
            onZoomIn={() => viewerRef.current?.zoomIn()}
            onZoomOut={() => viewerRef.current?.zoomOut()}
            onRecenter={() => viewerRef.current?.recenter()}
            onToggleFullscreen={() => void toggleFullscreen()}
          />
        </div>

        <div className="pointer-events-auto absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 md:bottom-auto md:top-1/2 md:-translate-y-1/2">
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
          <p
            className="pointer-events-none absolute left-1/2 z-30 max-w-[90%] -translate-x-1/2 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] px-3 py-1.5 text-center text-xs text-zinc-100 backdrop-blur-md"
            style={{ bottom: toastBottom }}
          >
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}
