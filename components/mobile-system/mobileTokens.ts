/**
 * mobileTokens.ts — Slate360 Graphite Glass shared mobile design tokens.
 *
 * All mobile-system components import from here.
 * /app and /site-walk must both use these values so layout geometry stays unified.
 */

export const MOBILE_PANEL_ROW_HEIGHT_PX = 72;
export const MOBILE_PANEL_ROW_GAP_PX = 6;
export const MOBILE_PANEL_COLLAPSED_BODY_PX = 180;
export const MOBILE_PANEL_COLLAPSED_FRAME_PX = 252;

/** MobileBottomNav content band: min-h-[58px] + pt-[4px] (nav sits below main, in shell flow). */
export const MOBILE_BOTTOM_NAV_HEIGHT_PX = 62;
export const MOBILE_HOME_DOCK_GAP_PX = 12;
export const MOBILE_HOME_DOCK_CONTENT_PAD_PX = 16;
export const MOBILE_HOME_DOCK_COLLAPSED_CLAMP = "clamp(240px,30dvh,320px)";
export const MOBILE_HOME_DOCK_EXPANDED_CLAMP = "60dvh";

const mobileTabbedPanelScrollBody = "min-h-0 flex-1 overflow-y-auto";
const mobileTabbedPanelBodyPadding = "px-3 pt-2 pb-3";

export const mobileTokens = {
  pageBgHex: "#0B0F15",

  // ── Layout (home launcher + dock) ─────────────────────────────────────────
  pagePaddingX: "px-4",
  sectionGap: "gap-4",
  /** Vertical gap between Your Apps, Quick Actions, module intro, etc. */
  mobileHomeContentGap: "gap-3",
  mobileHomeSectionGap: "gap-3",
  /** Shared shell vertical rhythm (/app + /site-walk) */
  mobileShellContentTopGap: "pt-3",
  mobileShellContentPaddingX: "px-4",
  mobileShellContentStackGap: "gap-3",
  /** MobileHomeLayout — balanced fixed regions (/app + /site-walk) */
  mobileHomeLayoutRoot:
    "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
  mobileHomeUpperRegion:
    "relative z-0 flex shrink-0 flex-col overflow-hidden",
  mobileHomeUpperInner:
    "mx-auto flex w-full max-w-2xl shrink-0 flex-col px-4 pt-3 pb-0",
  mobileHomeContentStack: "flex shrink-0 flex-col gap-2",
  mobileHomePrimaryActionsRegion: "shrink-0 flex flex-col",
  mobileHomeAppPrimaryActionsRegion: "shrink-0 flex flex-col",
  /** /app upper block — shrink to content so the activity dock sits directly below Quick Actions */
  mobileHomeAppUpperRegion:
    "relative z-0 flex shrink-0 flex-col overflow-hidden",
  mobileHomeAppContentStack: "flex shrink-0 flex-col gap-2",
  mobileHomeAppUpperInner:
    "mx-auto flex w-full max-w-2xl shrink-0 flex-col px-4 pt-2 pb-0",
  mobileHomeAppDockTopSpacer: "h-0 max-h-0 shrink-0 overflow-hidden",
  mobileHomeDockTopSpacer: "h-0 max-h-0 shrink-0 overflow-hidden",
  mobileHomeDockRegion: "relative z-10 w-full shrink-0 px-4 pb-0",
  mobileHomeDockInner: "mx-auto w-full max-w-2xl",
  /** Legacy anchored bottom sheet tokens (deprecated) */
  mobileHomeContentScroll: "relative z-0 h-full min-h-0 overflow-y-auto overscroll-contain",
  mobileHomeContentInner: "mx-auto w-full max-w-2xl",
  mobileHomeContentBottomPadding:
    "pb-[calc(clamp(240px,30dvh,300px)+12px+16px)]",
  mobileHomeDockHost: "pointer-events-none absolute inset-x-0 z-20 px-4",
  mobileHomeDockBottomOffset: "bottom-3",
  mobileHomeDockHostInner: "pointer-events-auto w-full",
  mobileHomeDockGap: "12px",
  mobileHomeDockCollapsedHeight:
    "h-[clamp(240px,30dvh,320px)] max-h-[clamp(240px,30dvh,320px)] min-h-[clamp(240px,30dvh,320px)] shrink-0",
  mobileHomeAppDockCollapsedHeight:
    "h-[252px] max-h-[252px] min-h-[252px] shrink-0",
  mobileHomeDockExpandedHeight:
    "h-[60dvh] max-h-[60dvh] min-h-[60dvh] shrink-0",
  mobileHomeDockCollapsedBody:
    "h-[180px] max-h-[180px] min-h-0 overflow-y-auto overscroll-contain",
  /** Legacy flex-flow allocation (deprecated — kept for reference) */
  mobileHomeContentZone: "flex min-h-0 flex-1 flex-col pt-3",
  mobileHomeContentStackLegacy: "mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col",
  mobileHomePrimaryActionsZone: "flex min-h-0 flex-1 flex-col",
  mobileHomeContentDockSpacer:
    "shrink-0 h-[clamp(8px,2dvh,24px)] min-h-2 max-h-6",
  mobileHomeDockZone: "relative shrink-0",
  /** Capped gap between upper launcher block and dock — legacy upper-in-panel path */
  mobileShellDockSpacerMin: "min-h-3",
  mobileShellDockSpacerMax: "max-h-12",
  mobileShellDockSpacerPreferred: "h-[clamp(12px,3dvh,32px)]",
  mobileShellDockSpacer:
    "shrink-0 min-h-3 max-h-12 h-[clamp(12px,3dvh,32px)]",
  mobileShellDockGap: "gap-0",
  /** Gap between upper launcher block and expandable dock — prefer mobileShellDockSpacerMin */
  mobileDockTopGap: "gap-1.5",
  mobilePanelBottomGap: "pb-3",

  // ── Semantic accents (Graphite Glass — restrained, not yellow-heavy) ───
  mobileAccentPrimary: "text-amber-400/90",
  mobileAccentPrimaryMuted: "text-amber-400/80",
  mobileAccentInfo: "text-cyan-400/90",
  mobileAccentNeutral: "text-zinc-400",
  mobileAccentNeutralBright: "text-zinc-200",
  mobileAccentMuted: "text-zinc-400/90",
  mobileAccentWarm: "text-amber-400/70",
  mobileAccentSuccess: "text-emerald-400",
  mobileAccentDanger: "text-red-400",
  mobileBrandWarmBorder: "border-amber-500/25",
  mobileBrandWarmGlow: "shadow-[0_0_8px_rgba(245,158,11,0.08)]",
  mobileBrandIconGlow: "drop-shadow-[0_0_10px_rgba(245,158,11,0.15)]",
  mobileBrandCoolGlow: "shadow-[0_0_8px_rgba(34,211,238,0.08)]",
  mobilePrimaryButton:
    "rounded-lg bg-amber-500/90 text-white hover:bg-amber-500",
  mobileAvatarRing:
    "flex size-6 items-center justify-center rounded-full bg-amber-500/12 text-[10px] font-bold text-amber-400/90 transition-colors hover:bg-amber-500/18",
  mobileHeaderToolIcon:
    "flex size-9 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200",
  mobileIconBgPrimary: "bg-amber-500/10 text-amber-400/90",
  mobileIconBgInfo: "bg-cyan-500/10 text-cyan-400/90",
  mobileIconBgNeutral: "bg-white/[0.06] text-zinc-300",

  // ── Section labels ───────────────────────────────────────────────────────
  sectionLabel:
    "mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-300",
  /** /app home section titles — larger than module sub-routes */
  appHomeSectionLabel:
    "text-xs font-black uppercase tracking-[0.2em] text-zinc-100",
  appHomeSectionLabelAccent: "mb-1.5 block h-0.5 w-8 rounded-full bg-amber-500/35",
  appHomeSectionLabelAccentCool: "mb-1.5 block h-0.5 w-8 rounded-full bg-cyan-500/30",
  sectionLabelAccent: "mb-1.5 h-0.5 w-6 rounded-full bg-amber-500/30",
  sectionLabelAccentCool: "mb-1.5 h-0.5 w-6 rounded-full bg-cyan-500/25",

  // ── Module home title (/site-walk) ───────────────────────────────────────
  moduleTitle: "text-[18px] font-bold leading-tight tracking-tight text-zinc-100",
  moduleTitleAccent: "text-amber-400/75",
  moduleSubtitle: "mt-0.5 text-[13px] leading-snug text-zinc-400",
  moduleBackButton:
    "flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-zinc-400 transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] hover:text-amber-400/90 active:bg-white/[0.11]",

  // ── Action card (Site Walk 2×2 module actions) ─────────────────────────
  actionCardHeight: "min-h-[78px]",
  mobileActionCardHeight: "min-h-[78px]",
  moduleActionCardHeight: "min-h-[58px]",
  moduleActionIconWrapper:
    "mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10",
  moduleActionIconClass: "h-3 w-3 text-amber-400/90",
  actionCardBase:
    "flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.04] text-zinc-300 transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.11]",
  actionIconClass: "h-4 w-4 text-zinc-400",
  actionLabelClass: "text-[10px] font-medium leading-tight text-center",

  // ── /app quick action 2×2 grid (do not share layout/height with Site Walk) ──
  appQuickActionGrid: "grid grid-cols-2 gap-2.5",
  appQuickActionCard:
    "flex h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.04] px-1.5 py-2 text-zinc-300 transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.11]",
  appQuickActionIcon: "h-5 w-5 shrink-0",
  appQuickActionLabel: "text-[12px] font-medium leading-tight text-center text-zinc-200",
  /** @deprecated Use appQuickActionGrid — legacy 1-row strip */
  appQuickActionStripRow: "grid grid-cols-4 gap-1.5",
  /** @deprecated Use appQuickActionCard */
  appQuickActionStripButton:
    "flex h-[50px] max-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-1 py-1.5 text-zinc-300 transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.11]",
  // ── Site Walk home 2×2 action grid — compact fixed-height cards with subtext ──
  siteWalkActionGridRow: "grid shrink-0 grid-cols-2 gap-2.5",
  siteWalkActionGridButton:
    "flex h-[92px] flex-col items-start justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left text-zinc-300 transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.11]",
  siteWalkActionGridIcon: "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]",
  siteWalkActionGridLabel: "text-[12px] font-semibold leading-tight text-zinc-100",
  siteWalkActionGridSubtext: "text-[10px] font-medium leading-snug text-zinc-500",
  /** @deprecated Use appQuickActionStripRow */
  quickActionStripRow: "grid grid-cols-4 gap-1.5",
  /** @deprecated Use siteWalkActionGridRow */
  quickActionGridRow: "grid h-full min-h-0 flex-1 grid-cols-2 auto-rows-fr gap-2.5",
  /** @deprecated Use appQuickActionStripButton */
  quickActionStripButton:
    "flex h-[50px] max-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-1 py-1.5 text-zinc-300 transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.11]",
  /** @deprecated Use siteWalkActionGridButton */
  quickActionGridButton:
    "flex h-full min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-2 text-zinc-300 transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.11]",
  quickActionStripIcon: "h-[18px] w-[18px] shrink-0",
  quickActionStripLabel: "text-[11px] font-medium leading-tight text-center text-zinc-300",

  // ── App launcher tile (/app Your Apps) ───────────────────────────────────
  appButtonBase:
    "flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-1.5 text-center transition-colors hover:border-amber-500/20 hover:bg-white/[0.07] active:bg-white/[0.09]",
  mobileAppLauncherTileHeight: "h-[110px] min-h-0 max-h-[116px]",
  appButtonIconWrapper:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
  appButtonIconClass: "h-3.5 w-3.5",
  appButtonTitleClass: "text-[11px] font-semibold leading-tight text-white",
  appButtonSubtitleClass: "text-[10px] leading-tight text-zinc-500/90",
  appBadgeInfo:
    "mt-0.5 rounded-full bg-cyan-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-400/90",

  // Legacy alias
  mobileAppButtonHeight: "h-[76px] min-h-0 max-h-[78px]",
  appCardBase:
    "flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] active:bg-white/[0.09]",
  appCardIconWrapper:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-amber-500",
  appCardIconClass: "h-5 w-5",

  // ── Contained scrolling panel ─────────────────────────────────────────────
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

  // ── Expandable activity dock ──────────────────────────────────────────────
  mobilePanelRowsCollapsedTarget: MOBILE_PANEL_COLLAPSED_BODY_PX,
  mobileExpandablePanelBottomGap: "pb-3",
  mobileExpandablePanelHandle: "block h-1 w-10 rounded-full bg-white/25",
  mobileExpandablePanelFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0B0F15] via-[#0B0F15]/85 to-transparent z-[1]",
  mobileExpandablePanelOuter: "relative z-30 w-full shrink-0 px-4 pb-3",
  mobileExpandablePanelExpandedPosition:
    "fixed inset-x-0 z-40 w-full px-4 pb-3 bottom-[calc(62px+env(safe-area-inset-bottom,0px))]",
  mobileExpandablePanelUpperScroll: "px-4",
  mobileExpandablePanelBackdrop:
    "absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] lg:hidden",
  mobileExpandablePanelFrame:
    "flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F15]/92 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[height] duration-200 ease-out",
  mobileExpandablePanelFrameExpanded:
    "shadow-[0_-12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10",
  mobileExpandablePanelChrome:
    "flex min-h-11 w-full shrink-0 touch-manipulation",
  mobileExpandablePanelToggleButton:
    "flex min-h-11 w-full flex-1 items-center justify-center gap-2 border-b border-white/10 px-3 py-2 text-zinc-400 transition-colors hover:bg-white/[0.04] active:bg-white/[0.08]",
  mobileExpandablePanelCollapsedHeight: "h-[252px] max-h-[252px] min-h-[252px] shrink-0",
  mobileExpandablePanelExpandedHeight:
    "h-[60dvh] max-h-[60dvh] min-h-[60dvh] shrink-0",
  mobileExpandablePanelCollapsedBody:
    "h-[180px] max-h-[180px] min-h-0 overflow-y-auto overscroll-contain",
  mobileExpandablePanelExpandedBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
  mobileExpandablePanelTabbedFill: "flex min-h-0 flex-1 flex-col border-0 bg-transparent shadow-none",

  expandablePanelOuter: "relative z-30 shrink-0 w-full px-4 pb-3",
  expandablePanelExpandedPosition: "absolute inset-x-0 bottom-0 z-40 w-full px-4 pb-3",
  expandablePanelUpperScroll: "px-4",
  expandablePanelBackdrop: "absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] lg:hidden",
  expandablePanelDock:
    "flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F15]/92 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[height] duration-200 ease-out",
  expandablePanelDockExpanded: "shadow-[0_-12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10",
  expandablePanelChrome: "flex shrink-0 items-center gap-1 border-b border-white/10 px-2",
  expandablePanelHandle: "block h-1 w-10 rounded-full bg-white/25",
  expandablePanelCollapsedFrame: "h-[252px] max-h-[252px] min-h-[252px]",
  expandablePanelExpandedFrame: "h-[60dvh] max-h-[60dvh] min-h-[60dvh]",
  expandablePanelCollapsedBody:
    "h-[180px] max-h-[180px] min-h-0 overflow-y-auto overscroll-contain",
  expandablePanelExpandedBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
  moduleListPanelContent: "pb-3",
  mobileHomeUpperBottomPad: "pb-0",

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

export type MobileAppAccent = "primary" | "info" | "neutral";
export type MobileQuickActionAccent = "primary" | "info" | "neutral" | "muted" | "warm";
