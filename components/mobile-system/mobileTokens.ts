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

/** Shared neutral shell chrome constants — S1 shared header + bottom nav. */
export const MOBILE_SHELL_CHROME = {
  canvas: "#0B0F15",
  surface: "#11161E",
  hairline: "#2A3340",
  iconFg: "#C9D3DF",
  navInactive: "#6B7889",
  navActive: "#FFFFFF",
  radius: "11px",
} as const;

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
  "rounded-xl border border-[var(--mobile-quick-action-border)] bg-[var(--mobile-quick-action-bg)] transition-all hover:border-[var(--accent-border-green)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)] active:scale-[0.99]";
const mobileHomeActionCard = `flex ${quickActionMinHeightClass} flex-col items-start justify-center gap-1 px-3 py-2.5 text-left ${mobileQuickActionCardSurface}`;
const mobileHomeActionGrid = "grid shrink-0 grid-cols-2 gap-2.5 auto-rows-fr";

export const mobileTokens = {
  pageBgHex: MOBILE_SHELL_CHROME.canvas,
  shellChromeSurface: MOBILE_SHELL_CHROME.surface,
  shellChromeHairline: MOBILE_SHELL_CHROME.hairline,
  shellChromeIconFg: MOBILE_SHELL_CHROME.iconFg,
  shellChromeNavInactive: MOBILE_SHELL_CHROME.navInactive,
  shellChromeNavActive: MOBILE_SHELL_CHROME.navActive,

  // ── Layout (home launcher + dock) ─────────────────────────────────────────
  pagePaddingX: "px-4",
  sectionGap: "gap-4",
  /** Shared shell vertical rhythm (/app + /site-walk) */
  mobileShellContentTopGap: "pt-3",
  mobileShellContentPaddingX: "px-4",
  mobileShellContentStackGap: "gap-3",
  /** MobileShell — gap between scroll content and dock (12px above, 6px below) */
  collapsedDockGap: "pt-3 pb-1.5",
  /** Stack quick actions + activity panel inside the dock slot */
  mobileShellDockStack: "flex w-full shrink-0 flex-col gap-3",
  /** MobileShell dock slot — sizes to content, no fixed frame height */
  collapsedDockHeight: "w-full shrink-0",
  /** Shared quick action / launcher tile minimum height */
  quickActionMinHeight: quickActionMinHeightClass,
  /** Bottom fade on MobileShell scroll region above dock */
  scrollContentBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-8 bg-gradient-to-t from-[var(--mobile-shell-canvas,#0B0F15)]/55 via-[var(--mobile-shell-canvas,#0B0F15)]/20 to-transparent",
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

  // ── Semantic accents (neutral graphite — no teal in shared tokens) ───────
  mobileTeal: "text-zinc-200",
  mobileTealBright: "text-zinc-100",
  mobileTealMuted: "text-zinc-300",
  mobileTealBorder: "border-white/15",
  mobileTealBorderHover: "hover:border-white/20",
  mobileTealBgSubtle: "bg-white/[0.05]",
  mobileTealBorderSubtle: "border-white/10",
  mobileAccentPrimary: "text-zinc-200",
  mobileAccentPrimaryMuted: "text-zinc-300",
  mobileAccentInfo: "text-zinc-200",
  mobileAccentNeutral: "text-zinc-200",
  mobileAccentNeutralBright: "text-zinc-100",
  mobileAccentMuted: "text-zinc-200",
  mobileAccentWarm: "text-zinc-300",
  mobileAccentSuccess: "text-zinc-200",
  mobileAccentDanger: "text-red-400",
  mobileBrandWarmBorder: "border-white/15",
  mobileBrandWarmGlow: "",
  mobileBrandIconGlow: "",
  mobileBrandCoolGlow: "",
  mobilePrimaryButton:
    "rounded-lg bg-[var(--mobile-field-primary-bg)] font-semibold text-[var(--mobile-field-primary-fg)] hover:brightness-[0.97] active:brightness-[0.92]",
  mobileAvatarRing:
    "flex size-6 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold text-zinc-200 transition-colors hover:bg-white/[0.12]",
  /** Platform header bar — neutral graphite chrome (44px row, 12px insets) */
  mobileHeaderBar:
    "flex h-11 shrink-0 items-center justify-between border-b border-[#2A3340] bg-[#11161E] px-3",
  mobileHeaderBrandLink:
    "flex min-w-0 shrink-0 items-center gap-2 rounded-[11px] transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]",
  mobileHeaderBackChevron: "size-5 shrink-0 text-[#C9D3DF]",
  mobileHeaderIconButton:
    "flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-[#2A3340] bg-[#11161E] text-[#C9D3DF] transition-colors hover:bg-white/[0.06] active:bg-white/[0.09]",
  mobileHeaderIconSize: "h-[18px] w-[18px]",
  mobileHeaderActionsRow: "ml-auto flex shrink-0 items-center gap-1.5",
  mobileModuleHomeBrandLink:
    "flex min-w-0 shrink-0 items-center gap-2 rounded-[11px] pr-1 transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]",
  mobileModuleHomeIconChipPrimary:
    "flex size-7 shrink-0 items-center justify-center rounded-[11px] border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)] text-[var(--mobile-app-card-icon-fg-primary)]",
  mobileModuleHomeIconChipInfo:
    "flex size-7 shrink-0 items-center justify-center rounded-[11px] border border-[var(--mobile-app-card-icon-border-info)] bg-[var(--mobile-app-card-icon-bg-info)] text-[var(--mobile-app-card-icon-fg-info)]",
  mobileModuleHomeIconChipIcon: "size-4",
  mobileModuleHomeName: "truncate text-[15px] font-semibold leading-none text-white",
  mobileHeaderPopover:
    "absolute right-0 top-[calc(100%+8px)] z-50 w-[min(280px,calc(100vw-2rem))] rounded-xl border border-[#2A3340] bg-[#11161E]/95 p-4 backdrop-blur-md",
  mobileHeaderPopoverLabel:
    "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400",
  mobileHeaderPopoverSubtext:
    "mt-3 text-center text-[11px] leading-snug text-zinc-400",
  mobileHeaderPopoverCta:
    "mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.09]",
  mobileHeaderSubrouteBack:
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[11px] border border-[#2A3340] bg-[#11161E] px-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white",
  mobileHeaderTitle:
    "truncate text-[16px] font-semibold leading-tight tracking-tight text-white",
  mobileHeaderSubtitle:
    "truncate text-[11px] font-bold uppercase leading-tight tracking-[0.1em] text-zinc-300 mt-0.5",
  mobileBottomNavItemActive: "font-semibold text-white",
  mobileBottomNavItemIdle:
    "text-[#6B7889] hover:bg-white/[0.04] hover:text-[#8A96A8]",
  mobileBottomNavLabel: "truncate text-[11px] font-medium leading-none",
  mobileBottomNavBar:
    "relative z-20 shrink-0 border-t border-[#2A3340] bg-[#11161E]",
  mobileModalOverlay:
    "fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md",
  mobileModalPanel:
    "relative w-full max-w-sm rounded-xl border border-[#2A3340] bg-[#11161E]/95 p-4 backdrop-blur-xl",
  mobilePageScrollInner:
    "mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-28",
  mobileGlassRowLink:
    "flex min-h-14 items-center gap-3 border-b border-white/[0.06] px-4 transition-colors last:border-b-0 hover:bg-white/[0.04]",
  mobileIconWell:
    "flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-zinc-200",
  mobileEyebrowLabel:
    "text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400",
  mobileHeaderToolIcon:
    "flex size-9 items-center justify-center text-zinc-100 transition-colors hover:text-white",
  mobileIconBgPrimary: "border border-white/10 bg-white/[0.05] text-zinc-200",
  mobileIconBgInfo: "border border-white/10 bg-white/[0.05] text-zinc-200",
  mobileIconBgNeutral: "border border-white/10 bg-white/[0.05] text-zinc-200",
  /** Shared icon chip — one shape/color across all mobile shells */
  mobileIconChip:
    "flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-zinc-200",
  mobileIconChipMd: "h-8 w-8",
  mobileIconChipLg: "h-10 w-10 rounded-xl",
  mobileIconChipIconMd: "h-5 w-5",
  mobileIconChipIconLg: "h-5 w-5",
  /** Shared glass card surface — background, border, radius, tap states */
  mobileGlassCardSurface:
    "rounded-xl border border-white/10 bg-white/[0.05] text-zinc-100 transition-all hover:border-white/15 hover:bg-white/[0.08] hover:text-white active:-translate-y-0.5 active:border-white/20 active:bg-white/[0.11] active:ring-2 active:ring-white/15",
  mobileGlassCardSelected:
    "border-white/25 bg-white/[0.07] ring-1 ring-white/15",
  mobileDockEmptyAction:
    "text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:underline",

  // ── Section labels ───────────────────────────────────────────────────────
  sectionLabel:
    "mb-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-100",
  appHomeSectionLabelAccentCool: "mb-1.5 block h-0.5 w-8 rounded-full bg-white/25",
  sectionLabelAccent: "mb-1.5 h-0.5 w-6 rounded-full bg-white/20",
  sectionLabelAccentCool: "mb-1.5 h-0.5 w-6 rounded-full bg-white/20",

  // ── Module home title (/site-walk, /digital-twin) ───────────────────────
  moduleTitle: "text-xl font-bold leading-tight tracking-tight text-white",
  moduleTitleAccent: "text-zinc-300",
  moduleSubtitle: "mt-0.5 text-sm leading-snug text-zinc-200",
  moduleBackButton:
    "flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-zinc-100 transition-colors hover:border-white/15 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.11]",

  // ── Shared home action cards (launcher + quick actions — all shells) ─────
  mobileHomeActionGrid,
  mobileHomeActionCard,
  mobileHomeActionCardSelected:
    "ring-2 ring-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)] bg-[color-mix(in_srgb,white_7%,transparent)]",
  mobileHomeActionIconWrapper:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border)] bg-[var(--mobile-quick-action-icon-bg)]",
  mobileHomeActionIconWrapperInfo:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border-info)] bg-[var(--mobile-quick-action-icon-bg-info)]",
  mobileHomeActionIcon: "h-6 w-6 shrink-0 text-[var(--mobile-quick-action-fg)]",
  mobileHomeActionIconInfo: "h-6 w-6 shrink-0 text-[var(--mobile-quick-action-fg-info)]",
  mobileHomeActionTitle:
    "text-base font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",
  mobileHomeActionTitleInfo:
    "text-base font-bold leading-tight text-[var(--mobile-quick-action-title-fg-info)]",
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
    "flex-1 rounded-none border-b-2 border-transparent py-2.5 text-sm font-semibold text-zinc-200 transition-colors data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white",
  mobileEmptyPanelHeight: "flex-1 min-h-[240px]",
  mobileListPanelHeight: "flex-1 min-h-[240px]",
  mobileTabbedPanelBodyPadding,
  mobileTabbedPanelScrollBody,
  panelContent: `${mobileTabbedPanelScrollBody} ${mobileTabbedPanelBodyPadding}`,
  panelBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--mobile-shell-canvas,#0B0F15)]/55 via-[var(--mobile-shell-canvas,#0B0F15)]/20 to-transparent z-[1]",

  // ── Expandable activity dock ──────────────────────────────────────────────
  mobilePanelRowsCollapsedTarget: MOBILE_PANEL_COLLAPSED_BODY_PX,
  mobileExpandablePanelBottomGap: "pb-3",
  mobileExpandablePanelHandle: "block h-1.5 w-12 rounded-full bg-white/40",
  mobileExpandablePanelFade:
    "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--mobile-shell-canvas,#0B0F15)]/55 via-[var(--mobile-shell-canvas,#0B0F15)]/20 to-transparent z-[1]",
  mobileExpandablePanelCollapsedBodyFade:
    "pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-14 bg-gradient-to-t from-[var(--mobile-shell-canvas,#0B0F15)]/70 from-45% via-[var(--mobile-shell-canvas,#0B0F15)]/30 via-75% to-transparent",
  mobileExpandablePanelChevron: "size-7 shrink-0 text-zinc-300",
  mobileExpandablePanelTabTrigger:
    "flex-1 rounded-none border-b-2 border-transparent py-2.5 text-sm font-semibold text-zinc-200 transition-colors data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white",
  mobileExpandablePanelToggleAccent: "flex-col gap-1 py-1.5 text-zinc-300",
  mobileExpandablePanelOuter: "relative z-30 w-full shrink-0 px-4 pb-3",
  mobileExpandablePanelExpandedPosition:
    "fixed inset-x-0 z-40 w-full px-4 pb-3 bottom-[calc(62px+env(safe-area-inset-bottom,0px))]",
  mobileExpandablePanelUpperScroll: "px-4",
  mobileExpandablePanelBackdrop:
    "absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] lg:hidden",
  mobileExpandablePanelFrame:
    "flex w-full flex-col overflow-hidden rounded-xl border border-[var(--mobile-expandable-panel-border)] bg-[var(--mobile-expandable-panel-bg)] backdrop-blur-md transition-[height] duration-200 ease-out",
  mobileExpandablePanelFrameExpanded: "",
  mobileExpandablePanelChrome:
    "flex min-h-11 w-full shrink-0 touch-manipulation",
  mobileExpandablePanelToggleButton:
    "flex min-h-11 w-full flex-1 items-center justify-center gap-2 border-b border-[var(--mobile-expandable-panel-border)] px-3 py-2 text-zinc-100 transition-colors hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)] active:bg-[color-mix(in_srgb,var(--surface-zinc)_88%,white)]",
  mobileExpandablePanelCollapsedHeight: "w-full shrink-0",
  mobileExpandablePanelExpandedHeight:
    "h-[60dvh] max-h-[60dvh] min-h-[60dvh] shrink-0",
  mobileExpandablePanelCollapsedBody:
    "h-[180px] max-h-[180px] min-h-0 overflow-y-auto overscroll-contain",
  mobileExpandablePanelExpandedBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
  mobileExpandablePanelTabbedFill: "flex min-h-0 flex-1 flex-col border-0 bg-transparent",

  moduleListPanelContent: "pb-3",

  emptyStateWrapper:
    "flex flex-col items-center justify-center gap-3 py-8 text-center",
  emptyStateWrapperCompact:
    "flex flex-col items-center justify-center gap-1.5 py-2 text-center",
  emptyStateIcon: "h-8 w-8 text-zinc-200",
  emptyStateText: "text-sm text-zinc-100 font-medium",
  emptyStateAction:
    "text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:underline",

  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",

  shellBrandLabel:
    "text-[17px] font-semibold leading-none tracking-tight text-white",

  ...mobileHomeTokens,
} as const;

export type MobileAppAccent = "primary" | "info" | "neutral";
export type MobileQuickActionAccent = "primary" | "info" | "neutral" | "muted" | "warm";
