/**
 * mobileTokens.ts — Slate360 Graphite Glass shared mobile design tokens.
 *
 * All mobile-system components import from here.
 * /app and /site-walk must both use these values so layout geometry stays unified.
 *
 * Do NOT scatter class strings across individual mobile components.
 * If a value needs updating, update it here and it applies everywhere.
 */

export const mobileTokens = {
  // ── Canvas ───────────────────────────────────────────────────────────────
  /** Base page background (graphite). Use as bg-[#0B0F15]. */
  pageBgHex: "#0B0F15",

  // ── Layout ───────────────────────────────────────────────────────────────
  pagePaddingX: "px-4",
  sectionGap: "gap-4",

  // ── Section label (e.g. "YOUR APPS", "QUICK ACTIONS") ────────────────────
  sectionLabel:
    "mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400",

  // ── Action card ──────────────────────────────────────────────────────────
  /**
   * Balanced value between /app 90px and /site-walk 100px.
   * Adopted size: 96px.
   */
  actionCardHeight: "min-h-[96px]",
  actionCardBase:
    "flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-amber-500/25 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]",

  /**
   * Icon inside an action card.
   * Standardized on size-7 (28px) for better iPhone readability.
   * (Previous /app used h-6 w-6; /site-walk used size-7. Unified to size-7.)
   */
  actionIconClass: "h-7 w-7 text-amber-500",

  actionLabelClass: "text-[13px] font-medium leading-tight text-center",

  // ── App card (horizontal tile for "Your Apps") ───────────────────────────
  appCardBase:
    "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] active:bg-white/[0.09]",
  appCardIconWrapper:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400",
  appCardIconClass: "h-5 w-5",

  // ── Contained scrolling panel ─────────────────────────────────────────────
  panelBase:
    "relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]",
  panelTabStripWrapper: "shrink-0 border-b border-white/5 px-3",
  panelTabList: "h-9 w-full bg-transparent p-0",
  /**
   * Full class string for a TabsTrigger in a MobileTabbedPanel.
   * Uses Radix data-[state=active] selectors for the amber indicator.
   */
  panelTabTrigger:
    "flex-1 rounded-none border-b-2 border-transparent py-2 text-[12px] font-medium text-zinc-500 transition-colors data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none",
  panelContent: "min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-6",
  panelBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0B0F15]/90 to-transparent",

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyStateWrapper:
    "flex flex-col items-center justify-center gap-2 py-8 text-center",
  emptyStateIcon: "h-6 w-6 text-zinc-600",
  emptyStateText: "text-xs text-zinc-600",
  emptyStateAction: "text-[11px] text-amber-500 hover:underline",

  // ── Focus ring ───────────────────────────────────────────────────────────
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",
} as const;
