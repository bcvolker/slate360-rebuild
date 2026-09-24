export function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function scaleFromPinch(startScale: number, startDistance: number, nextDistance: number): number {
  if (startDistance <= 0 || nextDistance <= 0) return startScale;
  return startScale * (nextDistance / startDistance);
}
