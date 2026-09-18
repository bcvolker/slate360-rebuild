"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * A single, shared fullscreen hook for vNext Explore. The existing app has two independent ad hoc
 * fullscreen implementations (components/digital-twin/MeshTwinViewer.tsx and
 * TwinViewerCanvasShell.tsx) — this follows the more robust of the two (TwinViewerCanvasShell):
 * state is derived from the real `fullscreenchange` event, not assumed to always succeed.
 */
export function useVnextFullscreen(containerRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement) && document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [containerRef]);

  const enterFullscreen = useCallback(async () => {
    const node = containerRef.current;
    if (!node || !node.requestFullscreen) return;
    try {
      await node.requestFullscreen();
    } catch {
      // User gesture requirement not met, or the browser refused — leave state as-is.
    }
  }, [containerRef]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Nothing to recover from — the browser already knows its own fullscreen state.
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) void exitFullscreen();
    else void enterFullscreen();
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
