/** Default twin workspace title for ad-hoc quick scan entry. */
export function formatQuickScanSpaceTitle(date = new Date()): string {
  return formatVisitTitle(date);
}

/** Operator-facing default: editable before capture starts. */
export function formatVisitTitle(date = new Date()): string {
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}
