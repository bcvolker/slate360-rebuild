/**
 * mobileTokens.ts — Slate360 Graphite Glass shared mobile design tokens.
 *
 * All mobile-system components import from here.
 * /app and /site-walk must both use these values so layout geometry stays unified.
 */

import { mobileHomeTokens } from "./mobileHomeTokens";

export { mobileHomeTokens, appHomeLauncherCardPrimaryBase } from "./mobileHomeTokens";

export const MOBILE_PANEL_ROW_HEIGHT_PX = 72;
export const MOBILE_PANEL_ROW_GAP_PX = 6;
export const MOBILE_PANEL_COLLAPSED_BODY_PX = 180;
export const MOBILE_PANEL_COLLAPSED_FRAME_PX = 252;

/** MobileBottomNav content band: min-h-[58px] + pt-[4px] (nav sits below main, in shell flow). */
export const MOBILE_BOTTOM_NAV_HEIGHT_PX = 62;
export const MOBILE_HOME_DOCK_GAP_PX = 4;
export const MOBILE_COLLAPSED_DOCK_GAP_PX = 12;
export const MOBILE_QUICK_ACTION_MIN_HEIGHT_PX = 112;
export const MOBILE_HOME_DOCK_CONTENT_PAD_PX = 16;
export const MOBILE_HOME_DOCK_COLLAPSED_CLAMP = "clamp(240px,30dvh,320px)";
export const MOBILE_HOME_DOCK_EXPANDED_CLAMP = "60dvh";

const mobileTabbedPanelScrollBody = "min-h-0 flex-1 overflow-y-auto";
const mobileTabbedPanelBodyPadding = "px-3 pt-2 pb-3";

/** Shared home action card — secondary quick actions (translucent glass, green accent) */
const quickActionMinHeightClass = "min-h-[112px]";
const mobileQuickActionCardSurface =
  "rounded-xl border border-[var(--mobile-quick-action-border)] bg-[var(--mobile-quick-action-bg)] shadow-[var(--mobile-quick-action-shadow)] transition-all hover:border-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] hover:bg-[color-mix(in_srgb,white_6%,transparent)] active:scale-[0.99]";
const mobileHomeActionCard = `flex ${quickActionMinHeightClass} flex-col items-start justify-center gap-1 px-3 py-2.5 text-left ${mobileQuickActionCardSurface}`;
const mobileHomeActionGrid = "grid shrink-0 grid-cols-2 gap-2.5 auto-rows-fr";

export const mobileTokens = {
  pageBgHex: "#0B0F15",

  // ── Layout (home launcher + dock) ─────────────────────────────────────────
  pagePaddingX: "px-4",
  sectionGap: "gap-4",
  /** Shared shell vertical rhythm (/app + /site-walk) */
  mobileShellContentTopGap: "pt-3",
  mobileShellContentPaddingX: "px-4",
  mobileShellContentStackGap: "gap-3",
  /** MobileShell — gap between scroll content and dock (12px top + bottom) */
  collapsedDockGap: "pt-3 pb-3",
  /** Stack quick actions + activity panel inside the dock slot */
  mobileShellDockStack: "flex w-full shrink-0 flex-col gap-3",
  /** MobileShell dock slot — sizes to content, no fixed frame height */
  collapsedDockHeight: "w-full shrink-0",
  /** Shared quick action / launcher tile minimum height */
  quickActionMinHeight: quickActionMinHeightClass,
  /** Bottom fade on MobileShell scroll region above dock */
  scrollContentBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-8 bg-gradient-to-t from-[#0B0F15]/55 via-[#0B0F15]/20 to-transparent",
  /** Inner padding for home scroll surfaces inside MobileShell — flex-1 fills viewport */
  mobileShellScrollInner:
    "mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-3 px-4 pt-3 pb-3",
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

  // ── Semantic accents (Graphite Glass — muted teal, no amber in shells) ───
  mobileTeal: "text-teal-400/90",
  mobileTealBright: "text-teal-300",
  mobileTealMuted: "text-teal-400/75",
  mobileTealBorder: "border-teal-400/25",
  mobileTealBorderHover: "hover:border-teal-400/30",
  mobileTealBgSubtle: "bg-teal-400/10",
  mobileTealBorderSubtle: "border-teal-400/20",
  mobileAccentPrimary: "text-teal-400/90",
  mobileAccentPrimaryMuted: "text-teal-400/80",
  mobileAccentInfo: "text-teal-400/90",
  mobileAccentNeutral: "text-zinc-200",
  mobileAccentNeutralBright: "text-zinc-100",
  mobileAccentMuted: "text-zinc-200",
  mobileAccentWarm: "text-teal-400/80",
  mobileAccentSuccess: "text-teal-400/90",
  mobileAccentDanger: "text-red-400",
  mobileBrandWarmBorder: "border-teal-400/25",
  mobileBrandWarmGlow: "shadow-[0_0_8px_rgba(45,212,191,0.08)]",
  mobileBrandIconGlow: "drop-shadow-[0_0_10px_rgba(45,212,191,0.12)]",
  mobileBrandCoolGlow: "shadow-[0_0_8px_rgba(45,212,191,0.08)]",
  mobilePrimaryButton:
    "rounded-lg bg-[var(--mobile-field-primary-bg)] font-semibold text-[var(--mobile-field-primary-fg)] shadow-[0_2px_10px_rgba(0,0,0,0.28)] hover:brightness-[0.97] active:brightness-[0.92]",
  mobileAvatarRing:
    "flex size-6 items-center justify-center rounded-full bg-teal-400/12 text-[10px] font-bold text-teal-300 transition-colors hover:bg-teal-400/18",
  /** Platform header bar — Graphite Glass chrome for all mobile shells */
  mobileHeaderBar:
    "flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0B0F15]/90 px-4 backdrop-blur-xl",
  mobileHeaderBrandLink:
    "flex min-w-0 shrink-0 items-center gap-2 rounded-lg transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]",
  mobileHeaderBackChevron: "size-5 shrink-0 text-zinc-200",
  mobileHeaderIconButton:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-200 transition-colors hover:border-teal-400/30 hover:bg-white/[0.06] hover:text-white",
  mobileHeaderIconSize: "h-[18px] w-[18px]",
  mobileHeaderActionsRow: "ml-auto flex shrink-0 items-center gap-1.5",
  mobileHeaderPopover:
    "absolute right-0 top-[calc(100%+8px)] z-50 w-[min(280px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#0B0F15]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md",
  mobileHeaderPopoverLabel:
    "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400",
  mobileHeaderPopoverSubtext:
    "mt-3 text-center text-[11px] leading-snug text-zinc-400",
  mobileHeaderPopoverCta:
    "mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-teal-400/30 bg-teal-400/10 text-sm font-medium text-teal-300 transition-colors hover:bg-teal-400/15",
  mobileHeaderSubrouteBack:
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-teal-400/25 hover:bg-white/[0.08] hover:text-white",
  mobileHeaderTitle:
    "truncate text-[16px] font-semibold leading-tight tracking-tight text-white",
  mobileHeaderSubtitle:
    "truncate text-[11px] font-bold uppercase leading-tight tracking-[0.1em] text-zinc-300 mt-0.5",
  mobileBottomNavItemActive: "bg-white/[0.14] font-semibold text-white",
  mobileBottomNavItemIdle:
    "text-zinc-100/90 hover:bg-white/[0.07] hover:text-white",
  mobileBottomNavActiveIndicator:
    "absolute left-1/2 top-0 h-[2.5px] w-10 -translate-x-1/2 rounded-b-full bg-[var(--mobile-field-primary-bg)] shadow-[0_2px_12px_rgba(0,0,0,0.35)]",
  mobileBottomNavBar:
    "relative z-20 shrink-0 rounded-t-3xl border-t border-white/20 bg-[#0B0F15]/96 shadow-[0_-10px_28px_rgba(0,0,0,0.5)] backdrop-blur-lg",
  mobileModalOverlay:
    "fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md",
  mobileModalPanel:
    "relative w-full max-w-sm rounded-xl border border-white/10 bg-[#0B0F15]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl",
  mobilePageScrollInner:
    "mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-28",
  mobileGlassRowLink:
    "flex min-h-14 items-center gap-3 border-b border-white/[0.06] px-4 transition-colors last:border-b-0 hover:bg-white/[0.04]",
  mobileIconWell:
    "flex shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-400/90",
  mobileEyebrowLabel:
    "text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400",
  mobileHeaderToolIcon:
    "flex size-9 items-center justify-center text-zinc-100 transition-colors hover:text-white",
  mobileIconBgPrimary: "border border-teal-400/20 bg-teal-400/10 text-teal-400/90",
  mobileIconBgInfo: "border border-teal-400/20 bg-teal-400/10 text-teal-400/90",
  mobileIconBgNeutral: "border border-teal-400/20 bg-teal-400/10 text-teal-400/90",
  /** Shared icon chip — one shape/color across all mobile shells */
  mobileIconChip:
    "flex shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-400/90",
  mobileIconChipMd: "h-8 w-8",
  mobileIconChipLg: "h-10 w-10 rounded-xl",
  mobileIconChipIconMd: "h-5 w-5",
  mobileIconChipIconLg: "h-5 w-5",
  /** Shared glass card surface — background, border, radius, tap states */
  mobileGlassCardSurface:
    "rounded-xl border border-white/10 bg-white/[0.05] text-zinc-100 transition-all hover:border-white/15 hover:bg-white/[0.08] hover:text-white active:-translate-y-0.5 active:border-teal-400/30 active:bg-white/[0.11] active:ring-2 active:ring-teal-400/30",
  mobileGlassCardSelected:
    "border-teal-400/35 bg-white/[0.07] ring-1 ring-teal-400/25",
  mobileDockEmptyAction:
    "text-sm font-medium text-teal-300 hover:text-teal-200 hover:underline",

  // ── Section labels ───────────────────────────────────────────────────────
  sectionLabel:
    "mb-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-100",
  appHomeSectionLabelAccentCool: "mb-1.5 block h-0.5 w-8 rounded-full bg-teal-400/35",
  sectionLabelAccent: "mb-1.5 h-0.5 w-6 rounded-full bg-teal-400/30",
  sectionLabelAccentCool: "mb-1.5 h-0.5 w-6 rounded-full bg-teal-400/30",

  // ── Module home title (/site-walk, /digital-twin) ───────────────────────
  moduleTitle: "text-xl font-bold leading-tight tracking-tight text-white",
  moduleTitleAccent: "text-teal-400/75",
  moduleSubtitle: "mt-0.5 text-sm leading-snug text-zinc-200",
  moduleBackButton:
    "flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-zinc-100 transition-colors hover:border-teal-400/25 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.11]",

  // ── Shared home action cards (launcher + quick actions — all shells) ─────
  mobileHomeActionGrid,
  mobileHomeActionCard,
  mobileHomeActionCardSelected:
    "ring-2 ring-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)] bg-[color-mix(in_srgb,white_7%,transparent)]",
  mobileHomeActionIconWrapper:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border)] bg-[var(--mobile-quick-action-icon-bg)]",
  mobileHomeActionIcon: "h-6 w-6 shrink-0 text-[var(--mobile-quick-action-fg)]",
  mobileHomeActionTitle:
    "text-base font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",
  mobileHomeActionSubtext:
    "text-sm font-medium leading-snug text-[var(--mobile-quick-action-subtitle-fg)]",

  // ── Legacy aliases (launcher + quick action tokens) ───────────────────────
  mobileQuickActionGrid: mobileHomeActionGrid,
  mobileQuickActionCard: mobileHomeActionCard,
  mobileQuickActionCardSurface: mobileHomeActionCard,
  mobileQuickActionCardApp: mobileHomeActionCard,
  mobileQuickActionCardModule: mobileHomeActionCard,
  mobileQuickActionIconWrapper:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border)] bg-[var(--mobile-quick-action-icon-bg)]",
  mobileQuickActionIconWrapperModuleAccent: "",
  mobileQuickActionIcon: "h-6 w-6 shrink-0 text-[var(--mobile-quick-action-fg)]",
  mobileQuickActionIconModuleAccent: "",
  mobileQuickActionLabel:
    "text-base font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",
  mobileQuickActionSubtext:
    "text-sm font-medium leading-snug text-[var(--mobile-quick-action-subtitle-fg)]",

  // ── Action card (legacy aliases → shared quick action tokens) ───────────
  actionCardHeight: quickActionMinHeightClass,
  mobileActionCardHeight: quickActionMinHeightClass,
  moduleActionCardHeight: quickActionMinHeightClass,
  moduleActionIconWrapper:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border)] bg-[var(--mobile-quick-action-icon-bg)]",
  moduleActionIconClass: "h-6 w-6 text-[var(--mobile-quick-action-fg)]",
  actionCardBase: mobileHomeActionCard,
  actionIconClass: "h-6 w-6 text-[var(--mobile-quick-action-fg)]",
  actionLabelClass:
    "text-base font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",

  // ── Module home 2×2 action grid (aliases) ───────────────────────────────
  siteWalkActionGridIcon:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border)] bg-[var(--mobile-quick-action-icon-bg)]",
  siteWalkActionGridLabel:
    "text-base font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",
  siteWalkActionGridSubtext:
    "text-sm font-medium leading-snug text-[var(--mobile-quick-action-subtitle-fg)]",

  // ── Contained scrolling panel ─────────────────────────────────────────────
  panelBase:
    "relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.06]",
  panelTabStripWrapper: "shrink-0 border-b border-white/10 px-3",
  panelTabList: "h-10 w-full bg-transparent p-0",
  panelTabTrigger:
    "flex-1 rounded-none border-b-2 border-transparent py-2.5 text-sm font-semibold text-zinc-200 transition-colors data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none",
  mobileEmptyPanelHeight: "flex-1 min-h-[240px]",
  mobileListPanelHeight: "flex-1 min-h-[240px]",
  mobileTabbedPanelBodyPadding,
  mobileTabbedPanelScrollBody,
  panelContent: `${mobileTabbedPanelScrollBody} ${mobileTabbedPanelBodyPadding}`,
  panelBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0B0F15]/55 via-[#0B0F15]/20 to-transparent z-[1]",

  // ── Expandable activity dock ──────────────────────────────────────────────
  mobilePanelRowsCollapsedTarget: MOBILE_PANEL_COLLAPSED_BODY_PX,
  mobileExpandablePanelBottomGap: "pb-3",
  mobileExpandablePanelHandle: "block h-1.5 w-12 rounded-full bg-white/40",
  mobileExpandablePanelFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0B0F15]/55 via-[#0B0F15]/20 to-transparent z-[1]",
  mobileExpandablePanelCollapsedBodyFade:
    "pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-14 bg-gradient-to-t from-[#0B0F15]/70 from-45% via-[#0B0F15]/30 via-75% to-transparent",
  mobileExpandablePanelChevron: "size-7 shrink-0 text-teal-300",
  mobileExpandablePanelTabTrigger:
    "flex-1 rounded-none border-b-2 border-transparent py-2.5 text-sm font-semibold text-zinc-200 transition-colors data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none",
  mobileExpandablePanelToggleAccent: "flex-col gap-1 py-1.5 text-teal-400/90",
  mobileExpandablePanelOuter: "relative z-30 w-full shrink-0 px-4 pb-3",
  mobileExpandablePanelExpandedPosition:
    "fixed inset-x-0 z-40 w-full px-4 pb-3 bottom-[calc(62px+env(safe-area-inset-bottom,0px))]",
  mobileExpandablePanelUpperScroll: "px-4",
  mobileExpandablePanelBackdrop:
    "absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] lg:hidden",
  mobileExpandablePanelFrame:
    "flex w-full flex-col overflow-hidden rounded-xl border border-white/15 bg-white/[0.06] shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[height] duration-200 ease-out",
  mobileExpandablePanelFrameExpanded:
    "shadow-[0_-12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/15",
  mobileExpandablePanelChrome:
    "flex min-h-11 w-full shrink-0 touch-manipulation",
  mobileExpandablePanelToggleButton:
    "flex min-h-11 w-full flex-1 items-center justify-center gap-2 border-b border-white/15 px-3 py-2 text-zinc-100 transition-colors hover:bg-white/[0.05] active:bg-white/[0.09]",
  mobileExpandablePanelCollapsedHeight: "w-full shrink-0",
  mobileExpandablePanelExpandedHeight:
    "h-[60dvh] max-h-[60dvh] min-h-[60dvh] shrink-0",
  mobileExpandablePanelCollapsedBody:
    "h-[180px] max-h-[180px] min-h-0 overflow-y-auto overscroll-contain",
  mobileExpandablePanelExpandedBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
  mobileExpandablePanelTabbedFill: "flex min-h-0 flex-1 flex-col border-0 bg-transparent shadow-none",

  moduleListPanelContent: "pb-3",

  emptyStateWrapper:
    "flex flex-col items-center justify-center gap-3 py-8 text-center",
  emptyStateWrapperCompact:
    "flex flex-col items-center justify-center gap-1.5 py-2 text-center",
  emptyStateIcon: "h-8 w-8 text-zinc-200",
  emptyStateText: "text-sm text-zinc-100 font-medium",
  emptyStateAction: "text-sm font-medium text-teal-300 hover:text-teal-200 hover:underline",

  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",

  shellBrandLabel:
    "text-[17px] font-semibold leading-none tracking-tight text-white",

  ...mobileHomeTokens,
} as const;

export type MobileAppAccent = "primary" | "info" | "neutral";
export type MobileQuickActionAccent = "primary" | "info" | "neutral" | "muted" | "warm";
