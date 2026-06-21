"use client";

import { PanelResizeHandle } from "react-resizable-panels";

/**
 * Shared resize splitter for the studio workspaces — same grabbable interaction as
 * Content Studio (wide hit area, resize cursor, a center grip that brightens to the
 * Slate360 accent on hover/drag), on graphite tokens. Re-used by Thermal's Inspect,
 * Time-lapse/Video, and the other tabs so every studio feels like one product.
 */
export function StudioHandle({ vertical = false }: { vertical?: boolean }) {
  return (
    <PanelResizeHandle
      className={`group relative flex items-center justify-center bg-[color-mix(in_srgb,var(--graphite-text-header)_4%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] ${
        vertical ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"
      }`}
    >
      <div
        className={`rounded-sm bg-[color-mix(in_srgb,var(--graphite-text-header)_25%,transparent)] transition-colors group-hover:bg-[var(--graphite-primary)] group-data-[resize-handle-state=drag]:bg-[var(--graphite-primary)] ${
          vertical ? "h-8 w-[3px]" : "h-[3px] w-8"
        }`}
      />
    </PanelResizeHandle>
  );
}
