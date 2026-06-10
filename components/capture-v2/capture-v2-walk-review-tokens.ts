/** Graphite Glass tokens for the capture-v2 Walk Review slice. */

import { noteReviewTokens } from "./note-review/capture-v2-note-review-tokens";

export const WALK_REVIEW_MARGIN_PX = 12;
export const WALK_REVIEW_GRID_GAP_PX = 8;
export const WALK_REVIEW_VIRTUAL_THRESHOLD = 30;
export const WALK_REVIEW_ROW_HEIGHT_PX = 228;

export const walkReviewTokens = {
  canvas: noteReviewTokens.canvas,
  margin: noteReviewTokens.margin,
  glassBar: noteReviewTokens.glassBar,
  glassBarRadius: noteReviewTokens.glassBarRadius,
  monoGreenLabel: noteReviewTokens.monoGreenLabel,
  contextLine: "truncate text-xs font-medium text-[var(--graphite-muted)]",
  cardSurface: noteReviewTokens.cardSurface,
  ghostButton: noteReviewTokens.ghostButton,
  primaryButton: noteReviewTokens.primaryButton,
  pinnedBar: noteReviewTokens.pinnedBar,
  pinnedActions:
    "shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,transparent)] backdrop-blur-xl",
  hint: "text-center text-[11px] font-medium text-[var(--graphite-muted)]",
  badge:
    "inline-flex items-center gap-1 rounded-md border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_88%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--graphite-text-body)]",
  stopOverlay:
    "absolute left-1.5 top-1.5 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--graphite-text-header)]",
  noteSnippet: "line-clamp-2 text-xs leading-5 text-[var(--graphite-muted)]",
  statusOpen:
    "inline-flex rounded-md border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_90%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]",
  statusResolved:
    "inline-flex rounded-md border border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,var(--surface-zinc))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-primary)]",
  statusCritical:
    "inline-flex rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300",
} as const;
