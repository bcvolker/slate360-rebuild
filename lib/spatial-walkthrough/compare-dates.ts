export type CaptureDate = {
  walkthroughId: string;
  title: string;
  capturedAt: string;
};

export type DatePair = {
  before: CaptureDate;
  after: CaptureDate;
};

export function sortCaptures(captures: CaptureDate[]): CaptureDate[] {
  return captures.slice().sort((a, b) => a.capturedAt.localeCompare(b.capturedAt) || a.title.localeCompare(b.title));
}

export function datePairs(captures: CaptureDate[]): DatePair[] {
  const list = sortCaptures(captures);
  const pairs: DatePair[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      pairs.push({ before: list[i], after: list[j] });
    }
  }
  return pairs;
}

export function resolvePair(
  captures: CaptureDate[],
  beforeId: string | null,
  afterId: string | null,
): DatePair | null {
  const list = sortCaptures(captures);
  if (list.length < 2) return null;
  const before = list.find((c) => c.walkthroughId === beforeId) ?? list[0];
  const after = list.find((c) => c.walkthroughId === afterId && c.walkthroughId !== before.walkthroughId)
    ?? list.find((c) => c.walkthroughId !== before.walkthroughId)
    ?? null;
  if (!after) return null;
  if (before.capturedAt <= after.capturedAt) return { before, after };
  return { before: after, after: before };
}

export function formatCaptureDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
