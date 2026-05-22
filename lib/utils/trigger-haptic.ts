/**
 * Best-effort haptic feedback for mobile capture actions.
 * No-ops silently when vibration API is unavailable (common on iOS Safari).
 */
export function triggerHaptic(pattern: number | number[] = 12): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function triggerHapticSuccess(): void {
  triggerHaptic([10, 30, 10]);
}

export function triggerHapticWarning(): void {
  triggerHaptic([20, 40, 20, 40]);
}
