/**
 * Load-phase timestamps (ms since navigation start) for the Room 213 preview. Recorded unconditionally (cheap);
 * exposed on window only in ?internal=1. Names: posterVisible, modelRequest, modelFirstByte, modelTransferred,
 * modelDecoded, firstFrame, interactive.
 */
const marks: Record<string, number> = {};

export function markTiming(name: string): void {
  if (typeof performance === "undefined" || name in marks) return;
  marks[name] = Math.round(performance.now());
}

export function resetTiming(names: string[]): void {
  for (const n of names) delete marks[n];
}

export function getTiming(): Readonly<Record<string, number>> {
  return { ...marks };
}
