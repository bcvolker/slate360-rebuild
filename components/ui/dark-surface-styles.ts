/**
 * Canonical "graphite glass" surface styling — the single source of truth for the
 * dark authenticated UI. Consume these helpers instead of re-inlining class strings
 * on raw <input>/<button>/modal <div> elements; that re-inlining is exactly how the
 * dark form/button/modal look drifts (see the Phase 3 audit: 250+ near-duplicate
 * class strings across site-walk, slatedrop, capture-v2, projects, ops).
 *
 * Token-only — var(--graphite-*) / var(--graphite-primary). Never hardcode hex here
 * or at call sites. See docs/design/GRAPHITE_GLASS.md §7.
 *
 * These produce class strings (not components) so existing raw elements keep their
 * tags and behavior — adopting them is a zero-behavior-change dedup.
 */

/** Dark form field — input / textarea / select. Append per-field tweaks via `extra`. */
export function darkFieldClass(extra = ""): string {
  return `w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--graphite-text-header)] outline-none transition placeholder:text-[var(--graphite-muted)] focus:border-[var(--graphite-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)] ${extra}`.trim();
}

export type DarkButtonVariant = "primary" | "ghost" | "danger";

/** Dark action button. `primary` = teal CTA, `ghost` = subtle outline, `danger` = destructive. */
export function darkButtonClass(variant: DarkButtonVariant = "primary", extra = ""): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const byVariant: Record<DarkButtonVariant, string> = {
    primary: "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] hover:opacity-90",
    ghost: "border border-white/15 bg-white/5 text-[var(--graphite-text-header)] hover:bg-white/10",
    danger: "bg-[#EF4444] text-white hover:opacity-90",
  };
  return `${base} ${byVariant[variant]} ${extra}`.trim();
}

/** Modal overlay / backdrop. Covers the viewport, centers the panel, dims + blurs behind. */
export const darkModalOverlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm";

/** Modal panel container. Pass size (and any layout) via `extra`, e.g. "max-w-lg". */
export function darkModalPanelClass(extra = "max-w-lg"): string {
  return `flex max-h-[min(92dvh,640px)] w-full ${extra} flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--graphite-canvas)] shadow-2xl`.trim();
}

/** Label above a dark form field. */
export const darkFieldLabelClass =
  "mb-1 block text-xs font-semibold text-[var(--graphite-text-body)]";

/** Small uppercase section heading inside a dark panel. */
export const darkSectionLabelClass =
  "mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--graphite-muted)]";
