/**
 * Marketing homepage tokens — Graphite Glass, aligned with mobileTokens.pageBgHex (#0B0F15).
 * Subtle surface shifts, muted teal accents, no pills, no bright legacy green.
 */

export const MARKETING_PAGE_ROOT =
  "relative min-h-screen w-full bg-[#0B0F15] text-zinc-100";

/** Base canvas — hero, odd-index feature tiles, footer band */
export const MARKETING_SURFACE_BASE = "bg-[#0B0F15]";

/** Subtle lift — even-index feature tiles, pricing band */
export const MARKETING_SURFACE_ALT = "bg-white/[0.025]";

export const MARKETING_SNAP_SECTION =
  "marketing-snap-section relative flex w-full min-h-screen scroll-mt-20 flex-col items-center justify-center border-none px-4 py-10 pt-20 sm:px-6 md:py-12 md:pt-20 lg:scroll-mt-24 lg:flex-row lg:px-10 lg:justify-center lg:py-16 lg:pt-[4.25rem] lg:pb-16";

export const MARKETING_FLOW_SECTION =
  "marketing-flow-section relative block h-auto min-h-0 w-full scroll-mt-20 overflow-visible border-none px-4 py-12 clear-both sm:px-6 lg:scroll-mt-24 lg:px-10 lg:pb-28 lg:pt-16";

export const MARKETING_TAIL = "flex w-full flex-col lg:pb-10";

export const TILE_CONTENT =
  "tile-content flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm sm:p-6 lg:p-7";

export const TILE_CONTENT_COMPACT =
  "tile-content flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm lg:p-6";

export const TILE_CONTENT_ACCENT = "tile-content-accent text-teal-400/80";

export const PRICING_BLOCK =
  "mx-auto w-full max-w-[1400px] scroll-mt-20 lg:scroll-mt-24";

export const PRICING_CTA =
  "mt-6 inline-flex w-full items-center justify-center rounded-xl border border-teal-400/30 bg-teal-400/10 py-3.5 text-sm font-semibold tracking-tight text-teal-300 transition-all hover:border-teal-400/40 hover:bg-teal-400/15 active:scale-[0.99] lg:mt-8 lg:py-4";

export const PRICING_CTA_SECONDARY =
  "mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-sm font-semibold tracking-tight text-zinc-100 transition-all hover:border-white/15 hover:bg-white/[0.07] active:scale-[0.99] lg:mt-8 lg:py-4";

/** Rectangular segmented control — not pill-shaped */
export const TOGGLE_GROUP =
  "inline-flex flex-wrap items-center justify-center gap-0 rounded-xl border border-white/10 bg-white/[0.04] p-1";

export const TOGGLE_BUTTON_ACTIVE =
  "rounded-lg border border-teal-400/25 bg-teal-400/10 px-5 py-2.5 text-sm font-medium text-teal-300 transition-colors";

export const TOGGLE_BUTTON_IDLE =
  "rounded-lg border border-transparent px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200";

export const MARKETING_SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

export const MARKETING_HEADING =
  "text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl";

export const MARKETING_SUBHEAD =
  "mt-3 text-base leading-relaxed text-zinc-300 lg:text-lg";

export const MARKETING_PRICE =
  "text-3xl font-bold tracking-tight text-white sm:text-4xl";

export const MARKETING_PRICE_META = "text-sm text-zinc-400";
