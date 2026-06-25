/** Canonical safe-area padding — native `--safe-area-inset-*` first, then `env()`. */
export const SAFE_AREA_INSET_TOP =
  "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))" as const;

export const SAFE_AREA_INSET_RIGHT =
  "var(--safe-area-inset-right, env(safe-area-inset-right, 0px))" as const;

export const SAFE_AREA_INSET_BOTTOM =
  "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))" as const;

export const SAFE_AREA_INSET_LEFT =
  "var(--safe-area-inset-left, env(safe-area-inset-left, 0px))" as const;

export function safeAreaTopPadding(minPx = 0): string {
  return minPx > 0
    ? `max(${SAFE_AREA_INSET_TOP}, ${minPx}px)`
    : SAFE_AREA_INSET_TOP;
}