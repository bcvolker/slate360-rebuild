/** Apparent size from pitch. Floor-ahead reads larger; horizon smaller. Not geometric occlusion. */
export function markerScaleFromPitch(pitchDeg: number): number {
  const t = Math.min(1, Math.max(0, (-pitchDeg - 6) / 52));
  return Math.round((0.58 + t * 0.52) * 100) / 100;
}

export function markerKindFromPinType(pinType: string | undefined): "document" | "issue" | "note" {
  const t = (pinType ?? "document").toLowerCase();
  if (t === "issue") return "issue";
  if (t === "voice" || t === "note" || t === "other") return "note";
  return "document";
}
