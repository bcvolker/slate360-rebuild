/**
 * mobileTokens.ts — Slate360 Graphite Glass shared mobile design tokens.
 *
 * All mobile-system components import from here.
 * /app and /site-walk must both use these values so layout geometry stays unified.
 *
 * Do NOT scatter class strings across individual mobile components.
 * If a value needs updating, update it here and it applies everywhere.
 */

const mobileTabbedPanelScrollBody = "min-h-0 flex-1 overflow-y-auto";
const mobileTabbedPanelBodyPadding = "px-3 pt-2 pb-6";

export const mobileTokens = {
  // ── Canvas ───────────────────────────────────────────────────────────────
  /** Base page background (graphite). Use as bg-[#0B0F15]. */
  pageBgHex: "#0B0F15",

  // ── Layout ───────────────────────────────────────────────────────────────
  pagePaddingX: "px-4",
  sectionGap: "gap-4",
  mobileHomeSectionGap: "gap-3",
  mobilePanelBottomGap: "pb-4",

  // ── Section label (e.g. "YOUR APPS", "QUICK ACTIONS") ────────────────────
  sectionLabel:
    "mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400/90",
  // ── Brand-accented Section label (e.g. "SITE WALK") ─────────────────────
  brandSectionLabel:
    "mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-amber-500/90",

  // ── Action card ──────────────────────────────────────────────────────────
  /**
   * Balanced value between /app 90px and /site-walk 100px.
   * Adopted size: 96px.
   */
  actionCardHeight: "min-h-[90px]",
  mobileActionCardHeight: "min-h-[90px]",
  actionCardBase:
    "flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] text-zinc-300 transition-colors hover:border-amber-500/30 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]",

  /**
   * Icon inside an action card.
   * Standardized on size-7 (28px) for better iPhone readability.
   */
  actionIconClass: "h-7 w-7 text-zinc-400",

  actionLabelClass: "text-[13px] font-medium leading-tight text-center",

  // ── App card (horizontal tile for "Your Apps") ───────────────────────────
  appCardBase:
    "flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] active:bg-white/[0.09]",
  appCardIconWrapper:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-amber-500",
  appCardIconClass: "h-5 w-5",

  // ── App launcher button (2-col grid, vertical layout for "Your Apps") ────
  /** Compact vertical card: icon top, title + subtitle below. Lives in MobileActionGrid. */
  appButtonBase:
    "flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-4 text-center transition-colors hover:border-amber-500/30 hover:bg-white/[0.08] active:bg-white/[0.12]",
  mobileAppButtonHeight: "min-h-[96px]",
  appButtonIconWrapper:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-amber-500",
  appButtonIconClass: "h-5 w-5",

  // ── Contained scrolling panel ─────────────────────────────────────────────
  panelBase:
    "relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]",
  panelTabStripWrapper: "shrink-0 border-b border-white/5 px-3",
  panelTabList: "h-9 w-full bg-transparent p-0",
  /**
   * Full class string for a TabsTrigger in a MobileTabbedPanel.
   */
  panelTabTrigger:
    "flex-1 rounded-none border-b-2 border-transparent py-2 text-[13px] font-medium text-zinc-500 transition-colors data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 data-[state=active]:shadow-none",
  mobileEmptyPanelHeight: "flex-1 min-h-0",
  mobileListPanelHeight: "flex-1 min-h-0",
  mobileTabbedPanelBodyPadding,
  mobileTabbedPanelScrollBody,
  panelContent: `${mobileTabbedPanelScrollBody} ${mobileTabbedPanelBodyPadding}`,
  panelBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0B0F15]/90 to-transparent",
  moduleListPanelContent: "pb-12",

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyStateWrapper:
    "flex flex-col items-center justify-center gap-3 py-8 text-center",
  emptyStateIcon: "h-7 w-7 text-zinc-500",
  emptyStateText: "text-[13px] text-zinc-400 font-medium",
  emptyStateAction: "text-[12px] font-medium text-amber-500 hover:text-amber-400 hover:underline",

  // ── Focus ring ───────────────────────────────────────────────────────────
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",
} as const;
