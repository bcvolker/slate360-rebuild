/**
 * Pool project that holds scans made without a job. Operators see it as "Unfiled";
 * the name itself never needs to appear in client-facing UI.
 */
export const QUICK_SCAN_POOL_NAME = "Quick Scans";

export function isQuickScanPoolName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase() === QUICK_SCAN_POOL_NAME.toLowerCase();
}

/** Legacy alias kept for the native self-heal path (`TwinUploader.createQuickScanSpace`). */
export function formatQuickScanSpaceTitle(date = new Date()): string {
  return formatVisitTitle(date);
}

/**
 * Default label for one walk: "Sep 6 · 5:56 PM". Editable before capture starts and
 * stored on `digital_twin_captures.title`. Spaces (the twin) keep a stable name.
 */
export function formatVisitTitle(date = new Date()): string {
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} · ${timeLabel}`;
}
