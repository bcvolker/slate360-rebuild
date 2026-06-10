/** Shared glass surfaces for capture-v2 canvas HUD — matches top bar (~70% dark, hairline, 8–12px radius). */
export const captureCanvasGlass = {
  surface:
    "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] backdrop-blur-md",
  radiusSm: "rounded-lg",
  radiusMd: "rounded-[10px]",
  radiusLg: "rounded-xl",
  hintChip:
    "inline-block rounded-[10px] border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-3 py-1 backdrop-blur-md",
  labelChip:
    "rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-1.5 py-0.5 text-center backdrop-blur-md",
  filmstripTrack:
    "rounded-[10px] border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-2 py-1 backdrop-blur-md",
} as const;
