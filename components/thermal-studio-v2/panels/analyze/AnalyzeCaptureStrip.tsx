"use client";

import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

/**
 * Working-set list (left rail) and filmstrip (bottom dock) share this — same
 * data, same click-to-open + ✓-corner-select badges, different layout axis.
 * Vertical rows use background-tint only (no per-row border, matching Design
 * Studio's flat session list); the filmstrip keeps a thin border per thumbnail
 * since that's a genuine discrete-control case (same as Design Studio's
 * variant strip), just larger so images are actually recognizable.
 */
export function AnalyzeCaptureStrip({
  captures,
  activeId,
  selectedIds,
  onOpen,
  onToggleSelect,
  layout,
}: {
  captures: ThermalV2Capture[];
  activeId: string | null;
  selectedIds: Set<string>;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  layout: "vertical" | "horizontal";
}) {
  if (!captures.length) {
    return <div className="p-3 text-xs text-[var(--graphite-muted)]">No images in this session yet.</div>;
  }

  return (
    <div
      className={
        layout === "vertical"
          ? "flex h-full flex-col gap-0.5 overflow-y-auto p-2"
          : "flex h-full items-center gap-2 overflow-x-auto px-3 py-2"
      }
    >
      {captures.map((c) => {
        const active = c.id === activeId;
        const selected = selectedIds.has(c.id);
        const findingCount = c.anomalies?.length ?? 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpen(c.id)}
            title={c.filename}
            className={
              layout === "vertical"
                ? `relative flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--graphite-text-header)_5%,transparent)]"
                  }`
                : `relative flex h-24 w-24 shrink-0 flex-col justify-center overflow-hidden rounded-md border text-left transition-colors ${
                    active
                      ? "border-[var(--graphite-primary)] ring-1 ring-[var(--graphite-primary)]"
                      : "border-[var(--mobile-app-card-border)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_45%,var(--mobile-app-card-border))]"
                  }`
            }
          >
            {c.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.previewUrl}
                alt={c.filename}
                className={layout === "vertical" ? "h-8 w-8 shrink-0 rounded object-cover" : "h-full w-full object-cover"}
              />
            ) : (
              <div
                className={
                  layout === "vertical"
                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--graphite-canvas-deep)] text-[8px] text-[var(--graphite-muted)]"
                    : "flex h-full w-full items-center justify-center bg-[var(--graphite-canvas-deep)] p-1 text-center text-[9px] text-[var(--graphite-muted)]"
                }
              >
                {layout === "vertical" ? "" : c.filename}
              </div>
            )}
            {layout === "vertical" ? (
              <span
                className={`min-w-0 flex-1 truncate text-[11px] ${
                  active ? "text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"
                }`}
              >
                {c.filename}
              </span>
            ) : null}
            <span
              role="checkbox"
              aria-checked={selected}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(c.id);
              }}
              title={selected ? "Selected — click to deselect" : "Click to select"}
              className={`absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[8px] ${
                selected
                  ? "bg-[color-mix(in_srgb,var(--graphite-primary)_70%,transparent)] text-[var(--graphite-canvas)]"
                  : "bg-black/40 text-transparent"
              }`}
            >
              ✓
            </span>
            {findingCount > 0 ? (
              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[8px] font-bold text-[var(--graphite-text-header)]">
                {findingCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
