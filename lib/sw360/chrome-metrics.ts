/**
 * SW360 chrome geometry — SINGLE SOURCE for the bottom-nav height.
 *
 * The shell must reserve exactly as much room as the nav occupies. Those were
 * previously two independently-maintained numbers (the shell reserved 4.75rem
 * while the nav's intrinsic height had shrunk to ~3rem), leaving a ~27px band
 * of dead space above the nav on every screen. Both sides now derive from
 * this constant, so they cannot drift again.
 *
 * The nav is 3rem tall; the raised Capture bubble deliberately overflows
 * UPWARD (-mt-6) and must NOT be added to the reserve — it floats over
 * content by design and only covers the centre fifth of the width.
 */
export const SW360_NAV_HEIGHT_REM = 3;

/**
 * Total nav box height. border-box means this INCLUDES the safe-area padding,
 * so the visible bar stays SW360_NAV_HEIGHT_REM tall on every device while
 * still clearing the iPhone home indicator.
 */
export function sw360NavHeight(safeAreaInsetBottom: string): string {
  return `calc(${SW360_NAV_HEIGHT_REM}rem + ${safeAreaInsetBottom})`;
}

/** Bottom inset a scroll area needs so its last row clears the fixed nav. */
export function sw360ContentBottomInset(safeAreaInsetBottom: string): string {
  return sw360NavHeight(safeAreaInsetBottom);
}
