export type TwinCapturePolishMeasure = {
  coverageRingVisible: boolean;
  levelLineVisible: boolean;
  ghostVisible: boolean;
  captureGuideVisible: boolean;
  overlapPairs: string[];
  shutterToCaptureGuideGapPx: number | null;
  ghostToShutterOverlap: boolean;
};

function overlaps(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function measureTwinCapturePolishLayout(): TwinCapturePolishMeasure | null {
  const frame =
    document.querySelector<HTMLElement>('[data-dev-device="mobile"]') ??
    document.querySelector<HTMLElement>('[data-twin-capture-screen]');
  const shutter = document.querySelector<HTMLElement>('[data-twin-chrome="shutter"]');
  const captureGuide = document.querySelector<HTMLElement>('[data-twin-chrome="capture-guide"]');
  const levelLine = document.querySelector<HTMLElement>('[data-twin-chrome="level-line"]');
  const ghost = document.querySelector<HTMLElement>('[data-twin-chrome="clip-ghost-caption"]');
  const ghostOverlay = document.querySelector<HTMLElement>('[data-twin-chrome="clip-ghost"]');
  const coverageRing = document.querySelector<HTMLElement>('[data-twin-chrome="coverage-ring"]');
  const modeSelector = document.querySelector<HTMLElement>('[data-twin-chrome="mode-selector"]');
  const clipChips = document.querySelector<HTMLElement>('[data-twin-chrome="clip-chips"]');

  if (!frame || !shutter) return null;

  const shutterRect = shutter.getBoundingClientRect();
  const guideRect = captureGuide?.getBoundingClientRect() ?? null;
  const ghostRect = ghost?.getBoundingClientRect() ?? null;
  const modeRect = modeSelector?.getBoundingClientRect() ?? null;
  const clipRect = clipChips?.getBoundingClientRect() ?? null;

  const nodes = [
    guideRect && { id: "capture-guide", rect: guideRect },
    levelLine && { id: "level-line", rect: levelLine.getBoundingClientRect() },
    ghostRect && { id: "clip-ghost", rect: ghostRect },
    clipRect && { id: "clip-chips", rect: clipRect },
    modeRect && { id: "mode-selector", rect: modeRect },
    { id: "shutter", rect: shutterRect },
  ].filter(Boolean) as Array<{ id: string; rect: DOMRect }>;

  const overlapPairs: string[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      if (overlaps(a.rect, b.rect)) overlapPairs.push(`${a.id}×${b.id}`);
    }
  }

  return {
    coverageRingVisible: Boolean(coverageRing),
    levelLineVisible: Boolean(levelLine),
    ghostVisible: Boolean(ghostOverlay),
    captureGuideVisible: Boolean(captureGuide),
    overlapPairs,
    shutterToCaptureGuideGapPx: guideRect ? Math.round(guideRect.top - shutterRect.bottom) : null,
    ghostToShutterOverlap: ghostRect ? overlaps(ghostRect, shutterRect) : false,
  };
}
