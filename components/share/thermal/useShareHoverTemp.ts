"use client";

import { useEffect, useRef, useState } from "react";

type ShareGrid = { width: number; height: number; temps: number[]; minC: number; maxC: number };

/**
 * Radiometric Live Link (S7.5/A4) — lazily fetches the per-pixel grid for the
 * CURRENT image only (not the whole session) so a client with no login can
 * hover anywhere on the picture and read a real temperature, not a color.
 */
export function useShareHoverTemp(token: string | undefined, captureId: string | undefined) {
  const [grid, setGrid] = useState<ShareGrid | null>(null);
  const [tempC, setTempC] = useState<number | null>(null);
  const cache = useRef<Map<string, ShareGrid>>(new Map());

  useEffect(() => {
    setGrid(null);
    setTempC(null);
    if (!token || !captureId) return;
    const cached = cache.current.get(captureId);
    if (cached) {
      setGrid(cached);
      return;
    }
    let cancelled = false;
    void fetch(`/api/share/thermal/${token}/grid/${captureId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ShareGrid | null) => {
        if (cancelled || !json) return;
        cache.current.set(captureId, json);
        setGrid(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, captureId]);

  /** imgEl's own bounding box maps directly to grid pixels — no letterbox math needed (object-fit isn't used here). */
  function onHover(e: { clientX: number; clientY: number; currentTarget: HTMLElement }) {
    if (!grid) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * grid.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * grid.height);
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
      setTempC(null);
      return;
    }
    setTempC(grid.temps[y * grid.width + x] ?? null);
  }

  function onLeave() {
    setTempC(null);
  }

  return { hasGrid: Boolean(grid), tempC, onHover, onLeave };
}
