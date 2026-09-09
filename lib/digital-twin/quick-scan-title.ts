/**
 * Default twin workspace title for ad-hoc quick scan entry.
 *
 * Includes the time of day: two scans on the same day used to get byte-identical
 * titles ("Quick Scan — Sep 8"), which is what made the scan list read as random.
 */
export function formatQuickScanSpaceTitle(date = new Date()): string {
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Quick Scan — ${dateLabel}, ${timeLabel}`;
}
