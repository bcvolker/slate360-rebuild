type FitPlanOptions = {
  maxScale: number;
  minScale: number;
  padding: number;
  reservedBottom?: number;
  reservedTop?: number;
  surface: HTMLElement;
  viewport: HTMLElement;
};

export function calculateCenteredPlanTransform({ maxScale, minScale, padding, reservedBottom = 0, reservedTop = 0, surface, viewport }: FitPlanOptions) {
  const surfaceWidth = Math.max(1, surface.offsetWidth);
  const surfaceHeight = Math.max(1, surface.offsetHeight);
  const viewportWidth = Math.max(1, viewport.clientWidth);
  const viewportHeight = Math.max(1, viewport.clientHeight);
  const availableWidth = Math.max(1, viewportWidth - padding);
  const availableHeight = Math.max(1, viewportHeight - padding - reservedTop - reservedBottom);
  const scale = Math.min(availableWidth / surfaceWidth, availableHeight / surfaceHeight, maxScale);
  const nextScale = Math.min(maxScale, Math.max(minScale, scale));
  return { scale: nextScale, x: (viewportWidth - surfaceWidth * nextScale) / 2, y: reservedTop + (availableHeight - surfaceHeight * nextScale) / 2 };
}
