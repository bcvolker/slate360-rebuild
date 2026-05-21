/**
 * mobileTokens.ts — Slate360 Graphite Glass shared mobile design tokens.
 *
 * All mobile-system components import from here.
 * /app and /site-walk must both use these values so layout geometry stays unified.
 *
 * Do NOT scatter class strings across individual mobile components.
 * If a value needs updating, update it here and it applies everywhere.
 */

/** List row height (WalkV1Row min-h-[72px]) — used for 2.5-row collapsed target. */
export const MOBILE_PANEL_ROW_HEIGHT_PX = 72;
/** gap-1.5 between rows */
export const MOBILE_PANEL_ROW_GAP_PX = 6;
/** Collapsed body shows ~2.5 rows: 72*2.5 + 6*2 = 192px */
export const MOBILE_PANEL_COLLAPSED_BODY_PX = 192;
/** Chrome (~36) + tab strip (36) + body (192) */
export const MOBILE_PANEL_COLLAPSED_FRAME_PX = 264;

const mobileTabbedPanelScrollBody = "min-h-0 flex-1 overflow-y-auto";
const mobileTabbedPanelBodyPadding = "px-3 pt-2 pb-3";

export const mobileTokens = {
  // ── Canvas ───────────────────────────────────────────────────────────────
  /** Base page background (graphite). Use as bg-[#0B0F15]. */
  pageBgHex: "#0B0F15",

  // ── Layout ───────────────────────────────────────────────────────────────
  pagePaddingX: "px-4",
  sectionGap: "gap-4",
  mobileHomeSectionGap: "gap-3",
  mobilePanelBottomGap: "pb-3",

  // ── Section label (e.g. "YOUR APPS", "QUICK ACTIONS") ────────────────────
  sectionLabel:
    "mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400",

  // ── Action card ──────────────────────────────────────────────────────────
  actionCardHeight: "min-h-[96px]",
  mobileActionCardHeight: "min-h-[96px]",
  actionCardBase:
    "flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] text-zinc-300 transition-colors hover:border-amber-500/30 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]",
  actionIconClass: "h-7 w-7 text-zinc-400",
  actionLabelClass: "text-[13px] font-medium leading-tight text-center",

  // ── App card (horizontal tile for "Your Apps") ───────────────────────────
  appCardBase:
    "flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] active:bg-white/[0.09]",
  appCardIconWrapper:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-amber-500",
  appCardIconClass: "h-5 w-5",

  appButtonBase:
    "flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-4 text-center transition-colors hover:border-amber-500/30 hover:bg-white/[0.08] active:bg-white/[0.12]",
  mobileAppButtonHeight: "min-h-[104px]",
  appButtonIconWrapper:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-amber-500",
  appButtonIconClass: "h-5 w-5",

  // ── Contained scrolling panel (inner tab body) ───────────────────────────
  panelBase:
    "relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]",
  panelTabStripWrapper: "shrink-0 border-b border-white/5 px-3",
  panelTabList: "h-9 w-full bg-transparent p-0",
  panelTabTrigger:
    "flex-1 rounded-none border-b-2 border-transparent py-2 text-[13px] font-medium text-zinc-500 transition-colors data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 data-[state=active]:shadow-none",
  mobileEmptyPanelHeight: "flex-1 min-h-[240px]",
  mobileListPanelHeight: "flex-1 min-h-[240px]",
  mobileTabbedPanelBodyPadding,
  mobileTabbedPanelScrollBody,
  panelContent: `${mobileTabbedPanelScrollBody} ${mobileTabbedPanelBodyPadding}`,
  panelBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0B0F15] via-[#0B0F15]/80 to-transparent",

  // ── Expandable activity dock (/app + /site-walk) — single source of truth ─
  /** ~2.5 list rows visible when collapsed (72px rows + 6px gaps). */
  mobilePanelRowsCollapsedTarget: MOBILE_PANEL_COLLAPSED_BODY_PX,
  /** 12px gap between dock bottom edge and bottom nav top (pb-3). */
  mobileExpandablePanelBottomGap: "pb-3",
  mobileExpandablePanelHandle: "block h-1 w-10 rounded-full bg-white/25",
  mobileExpandablePanelFade: "pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0B0F15] via-[#0B0F15]/85 to-transparent z-[1]",
  mobileExpandablePanelOuter: "relative z-30 shrink-0 w-full px-4 pb-3",
  mobileExpandablePanelExpandedPosition:
    "absolute inset-x-0 bottom-0 z-40 w-full px-4 pb-3",
  mobileExpandablePanelUpperScroll: "px-4 py-4",
  mobileExpandablePanelBackdrop:
    "absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] lg:hidden",
  mobileExpandablePanelFrame:
    "flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F15]/92 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[height] duration-200 ease-out",
  mobileExpandablePanelFrameExpanded:
    "shadow-[0_-12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10",
  mobileExpandablePanelChrome:
    "flex shrink-0 items-center gap-1 border-b border-white/10 px-2",
  /** Collapsed dock: chrome + tabs + 2.5-row body */
  mobileExpandablePanelCollapsedHeight: "h-[264px] max-h-[264px] min-h-[264px]",
  /** Expanded dock: fixed tall sheet above bottom nav */
  mobileExpandablePanelExpandedHeight: "h-[min(52dvh,480px)] max-h-[min(52dvh,480px)] min-h-[min(52dvh,480px)]",
  mobileExpandablePanelCollapsedBody:
    "h-[192px] max-h-[192px] min-h-0 overflow-y-auto overscroll-contain",
  mobileExpandablePanelExpandedBody:
    "min-h-0 flex-1 overflow-y-auto overscroll-contain",
  mobileExpandablePanelTabbedFill: "flex min-h-0 flex-1 flex-col border-0 bg-transparent shadow-none",

  // Legacy aliases (avoid drift in docs/memory)
  expandablePanelOuter: "relative z-30 shrink-0 w-full px-4 pb-3",
  expandablePanelExpandedPosition: "absolute inset-x-0 bottom-0 z-40 w-full px-4 pb-3",
  expandablePanelUpperScroll: "px-4 py-4",
  expandablePanelBackdrop: "absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] lg:hidden",
  expandablePanelDock:
    "flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F15]/92 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[height] duration-200 ease-out",
  expandablePanelDockExpanded: "shadow-[0_-12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10",
  expandablePanelChrome: "flex shrink-0 items-center gap-1 border-b border-white/10 px-2",
  expandablePanelHandle: "block h-1 w-10 rounded-full bg-white/25",
  expandablePanelCollapsedFrame: "h-[264px] max-h-[264px] min-h-[264px]",
  expandablePanelExpandedFrame: "h-[min(52dvh,480px)] max-h-[min(52dvh,480px)] min-h-[min(52dvh,480px)]",
  expandablePanelCollapsedBody:
    "h-[192px] max-h-[192px] min-h-0 overflow-y-auto overscroll-contain",
  expandablePanelExpandedBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
  moduleListPanelContent: "pb-3",

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyStateWrapper:
    "flex flex-col items-center justify-center gap-3 py-8 text-center",
  emptyStateWrapperCompact:
    "flex flex-col items-center justify-center gap-1.5 py-2 text-center",
  emptyStateIcon: "h-7 w-7 text-zinc-500",
  emptyStateText: "text-[13px] text-zinc-400 font-medium",
  emptyStateAction: "text-[12px] font-medium text-amber-500 hover:text-amber-400 hover:underline",

  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",

  shellBrandLabel:
    "text-[17px] font-semibold leading-none tracking-tight text-white",
} as const;
