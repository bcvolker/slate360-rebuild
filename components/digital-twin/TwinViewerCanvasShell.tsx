"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TwinCommentsOverlay } from "@/components/digital-twin/TwinCommentsOverlay";
import {
  TwinViewerControlsOverlay,
  type TwinViewerCameraMode,
} from "@/components/digital-twin/TwinViewerControlsOverlay";
import { TwinViewerFooterDisclaimer } from "@/components/digital-twin/TwinViewerDisclaimer";
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
  showDisclaimer?: boolean;
  cameraMode?: TwinViewerCameraMode;
  onToggleCameraMode?: () => void;
  repositionMode?: boolean;
  onToggleReposition?: () => void;
  walkDisabledReason?: string | null;
  metricScaleApplied?: boolean;
};

const MOBILE_CONTROLS_OFFSET_PX = 12;

export function TwinViewerCanvasShell({
  children,
  viewerRef,
  commentsOpen,
  onToggleComments,
  commentCount,
  commentsTitle,
  commentsContent,
  toast,
  showDisclaimer = true,
  cameraMode = "orbit",
  onToggleCameraMode,
  repositionMode = false,
  onToggleReposition,
  walkDisabledReason = null,
  metricScaleApplied = false,
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

  const controlsBottom = `calc(env(safe-area-inset-bottom, 0px) + ${viewportBottomInset + MOBILE_CONTROLS_OFFSET_PX}px)`;
  const disclaimerBottom = `calc(env(safe-area-inset-bottom, 0px) + ${viewportBottomInset + 4}px)`;
  const toastBottom = `calc(env(safe-area-inset-bottom, 0px) + ${viewportBottomInset + 56}px)`;

  return (
    <div
      ref={containerRef}
      // `contain-layout` makes this the containing block for any `position: fixed`
      // descendant (the mobile Collaboration bottom-sheet in TwinCommentsOverlay) —
      // without it, that sheet escapes to the viewport and overlaps the Layers panel
      // + share controls rendered below the viewer in normal document flow.
      className="relative h-full min-h-0 w-full overflow-hidden contain-layout bg-[var(--graphite-canvas)]"
    >
      <div className="relative z-0 h-full min-h-0 w-full">{children}</div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <div
          className="pointer-events-auto absolute left-1/2 z-30 -translate-x-1/2 md:left-auto md:right-3 md:translate-x-0"
          style={{ bottom: controlsBottom }}
        >
          <TwinViewerControlsOverlay
            isFullscreen={isFullscreen}
            cameraMode={cameraMode}
            onRecenter={() => viewerRef.current?.recenter()}
            onToggleCameraMode={() => onToggleCameraMode?.()}
            onToggleFullscreen={() => void toggleFullscreen()}
            repositionMode={repositionMode}
            onToggleReposition={onToggleReposition}
            walkDisabledReason={walkDisabledReason}
          />
        </div>

        <div className="pointer-events-auto absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30">
          <TwinCommentsOverlay
            open={commentsOpen}
            onToggle={onToggleComments}
            count={commentCount}
            title={commentsTitle}
          >
            {commentsContent}
          </TwinCommentsOverlay>
        </div>

        {showDisclaimer ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-3"
            style={{ bottom: disclaimerBottom }}
          >
            <TwinViewerFooterDisclaimer className="relative" metricScaleApplied={metricScaleApplied} />
          </div>
        ) : null}

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
