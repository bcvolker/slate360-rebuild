/** Shared glass HUD backing for twin capture chrome over live camera. */

export const TWIN_CAPTURE_GLASS_BG =
  "bg-[color-mix(in_srgb,var(--graphite-canvas)_85%,transparent)]";

export const TWIN_CAPTURE_GLASS =
  `rounded-full border border-[var(--mobile-app-card-border)] ${TWIN_CAPTURE_GLASS_BG} backdrop-blur-md`;

export const TWIN_CAPTURE_GLASS_SQUARE =
  `rounded-xl border border-[var(--mobile-app-card-border)] ${TWIN_CAPTURE_GLASS_BG} backdrop-blur-md`;

/** High-contrast HUD label text over live camera. */
export const TWIN_CAPTURE_HUD_TEXT = "text-[#E8EDF3]";
