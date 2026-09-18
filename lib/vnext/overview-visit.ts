export type VisitCandidate = {
  iso: string | null | undefined;
  sourceLabel: string;
};

export type LatestVisit = {
  occurredAt: string;
  sourceLabel: string;
};

export function pickLatestVisit(candidates: VisitCandidate[]): LatestVisit | null {
  let best: { ms: number; iso: string; sourceLabel: string } | null = null;
  for (const candidate of candidates) {
    if (!candidate.iso) continue;
    const ms = Date.parse(candidate.iso);
    if (!Number.isFinite(ms)) continue;
    if (!best || ms > best.ms) best = { ms, iso: candidate.iso, sourceLabel: candidate.sourceLabel };
  }
  if (!best) return null;
  return { occurredAt: best.iso, sourceLabel: best.sourceLabel };
}

export function formatPlainDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}
