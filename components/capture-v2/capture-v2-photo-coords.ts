import type { Transform } from "@/components/site-walk/capture/markupCanvasGeometry";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Map viewport client coords to image-space percentages (stable under zoom/pan). */
export function clientToImagePct(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  transform: Transform,
): { xPct: number; yPct: number } {
  const xPct = (((clientX - rect.left - transform.x) / transform.scale) / rect.width) * 100;
  const yPct = (((clientY - rect.top - transform.y) / transform.scale) / rect.height) * 100;
  return { xPct: clamp(xPct, 0, 100), yPct: clamp(yPct, 0, 100) };
}
