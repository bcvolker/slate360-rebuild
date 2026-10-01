import { normalizeHex } from "./theme";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio, or null if either value is not hex. */
export function contrastRatio(foreground: string, background: string): number | null {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 == null || l2 == null) return null;
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastTone = "pass" | "aa-large" | "fail";

export function contrastTone(ratio: number | null): ContrastTone {
  if (ratio == null) return "fail";
  if (ratio >= 4.5) return "pass";
  if (ratio >= 3) return "aa-large";
  return "fail";
}

export function contrastWarning(foreground: string, background: string): string | null {
  const ratio = contrastRatio(foreground, background);
  if (ratio == null) return "Enter hex colors to check contrast.";
  const tone = contrastTone(ratio);
  const label = `${ratio.toFixed(1)}:1`;
  if (tone === "pass") return null;
  if (tone === "aa-large") return `${label} — large text only (WCAG AA)`;
  return `${label} — below WCAG AA for text`;
}
