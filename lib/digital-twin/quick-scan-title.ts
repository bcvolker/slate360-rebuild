/** Default twin workspace title for ad-hoc quick scan entry. */
export function formatQuickScanSpaceTitle(date = new Date()): string {
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Quick Scan — ${dateLabel}`;
}
