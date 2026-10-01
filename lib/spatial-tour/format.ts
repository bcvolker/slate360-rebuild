/** 83.4 → "1:23". Tour times are shown to the second; marks store full precision. */
export function formatClock(t: number | null | undefined): string {
  if (t == null || !Number.isFinite(t)) return "–";
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "2026-08-17T…" → "Aug 17, 2026". Absolute dates only. */
export function formatVisitDate(iso: string | null | undefined): string {
  if (!iso) return "Undated";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "Undated"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
