/**
 * Color adjustment model — one source of truth that drives BOTH the live preview
 * (CSS filter + temperature tint overlay) and the render worker (FFmpeg eq +
 * colorbalance). All values are 0-centered in [-100, 100]; 0 = neutral (no-op).
 *
 * "Master" applies to every clip (the adjustment-layer / apply-to-all). A per-clip
 * override, when present, replaces master for that clip.
 */

export type ColorAdjust = {
  exposure: number; // brightness
  contrast: number;
  saturation: number;
  temperature: number; // + warm, − cool
};

export const NEUTRAL_COLOR: ColorAdjust = { exposure: 0, contrast: 0, saturation: 0, temperature: 0 };

export function isNeutral(a: ColorAdjust | undefined | null): boolean {
  return !a || (a.exposure === 0 && a.contrast === 0 && a.saturation === 0 && a.temperature === 0);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Live-preview CSS filter (brightness/contrast/saturation). Temperature is a tint overlay. */
export function toCssFilter(a: ColorAdjust): string {
  const b = clamp(1 + a.exposure / 100, 0.2, 2).toFixed(3);
  const c = clamp(1 + a.contrast / 100, 0, 2).toFixed(3);
  const s = clamp(1 + a.saturation / 100, 0, 3).toFixed(3);
  return `brightness(${b}) contrast(${c}) saturate(${s})`;
}

/** Temperature tint overlay for the preview (rgba + soft-light blend). null when neutral temp. */
export function tempOverlay(a: ColorAdjust): { color: string } | null {
  if (!a.temperature) return null;
  const alpha = (Math.abs(a.temperature) / 100) * 0.28;
  return a.temperature > 0
    ? { color: `rgba(255,150,40,${alpha.toFixed(3)})` }
    : { color: `rgba(40,140,255,${alpha.toFixed(3)})` };
}

/** FFmpeg filter fragment for the render worker. Empty string when neutral. */
export function toFfmpegColor(a: ColorAdjust): string {
  if (isNeutral(a)) return "";
  const parts: string[] = [];
  const brightness = clamp((a.exposure / 100) * 0.4, -1, 1);
  const contrast = clamp(1 + a.contrast / 100, 0, 2);
  const saturation = clamp(1 + a.saturation / 100, 0, 3);
  parts.push(`eq=brightness=${brightness.toFixed(4)}:contrast=${contrast.toFixed(4)}:saturation=${saturation.toFixed(4)}`);
  if (a.temperature) {
    const t = (a.temperature / 100) * 0.3;
    parts.push(`colorbalance=rm=${t.toFixed(4)}:bm=${(-t).toFixed(4)}`);
  }
  return parts.join(",");
}

/** A clip's effective color: its override if present, else the master grade. */
export function effectiveColor(master: ColorAdjust, override: ColorAdjust | undefined): ColorAdjust {
  return override ?? master;
}
