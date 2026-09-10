/**
 * Light marketing homepage tokens — CSS vars only, no hardcoded hex.
 * Scoped to app/(public)/page.tsx and its own components. See
 * docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §0/§2. Do not reuse the dark
 * --graphite-* / MKT_* (marketing-styles.ts) tokens here, and don't import
 * these into dashboard/app surfaces.
 */

export const MKT_L_PAGE = "relative min-h-screen w-full bg-[var(--mkt-canvas)] text-[var(--mkt-ink-muted)]";

export const MKT_L_CONTAINER = "mx-auto w-full max-w-[1120px] px-6";

export const MKT_L_SECTION = "relative w-full py-16 sm:py-20 lg:py-24";

export const MKT_L_KICKER =
  "text-xs font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]";

export const MKT_L_H2 =
  "font-serif text-3xl font-normal leading-tight text-[var(--mkt-ink)] text-balance sm:text-4xl lg:text-[2.6rem]";

export const MKT_L_LEDE = "mt-3.5 max-w-[62ch] text-base leading-relaxed text-[var(--mkt-ink-muted)] sm:text-[17px]";

export const MKT_L_BTN_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[var(--mkt-accent)] px-6 text-[15px] font-semibold text-white shadow-[0_10px_26px_-10px_color-mix(in_srgb,var(--mkt-accent)_55%,transparent)] transition-all hover:brightness-110 active:scale-[0.99]";

export const MKT_L_BTN_GHOST =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[var(--mkt-line)] bg-white/60 px-6 text-[15px] font-semibold text-[var(--mkt-ink)] backdrop-blur-sm transition-all hover:border-[var(--mkt-accent-line)]";

export const MKT_L_LINK =
  "text-[var(--mkt-ink-muted)] transition-colors hover:text-[var(--mkt-ink)]";
