import { normalizeHex } from "./theme";

const HEX_IN_SVG = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const RGB_IN_SVG = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g;

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function saturation(hex: string): number {
  const n = normalizeHex(hex);
  if (!n) return 0;
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function uniquenessKey(hex: string): string {
  const n = normalizeHex(hex) ?? hex;
  return `${n[1]}${n[3]}${n[5]}`;
}

function rankColors(colors: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of colors) {
    const n = normalizeHex(c);
    if (!n || seen.has(uniquenessKey(n))) continue;
    seen.add(uniquenessKey(n));
    unique.push(n);
  }
  return unique.sort((a, b) => saturation(b) - saturation(a));
}

export function extractPaletteFromSvg(svg: string, limit = 8): string[] {
  const found: string[] = [];
  for (const m of svg.matchAll(HEX_IN_SVG)) {
    const n = normalizeHex(m[0]);
    if (n) found.push(n);
  }
  for (const m of svg.matchAll(RGB_IN_SVG)) {
    found.push(rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])));
  }
  return rankColors(found).slice(0, limit);
}

/** Histogram quantization of RGBA pixels. Commercially permissive; no extra dependency. */
export function extractPaletteFromPixels(data: Uint8ClampedArray | Uint8Array, limit = 6): string[] {
  const buckets = new Map<string, { hex: string; n: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 32) continue;
    const r = data[i] & 0xe0;
    const g = data[i + 1] & 0xe0;
    const b = data[i + 2] & 0xe0;
    const hex = rgbToHex(r + 16, g + 16, b + 16);
    const cur = buckets.get(hex);
    if (cur) cur.n += 1;
    else buckets.set(hex, { hex, n: 1 });
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((b) => b.hex)
    .filter((hex) => {
      const n = normalizeHex(hex);
      if (!n) return false;
      const lum = (parseInt(n.slice(1, 3), 16) + parseInt(n.slice(3, 5), 16) + parseInt(n.slice(5, 7), 16)) / 3;
      return lum > 18 && lum < 245;
    })
    .slice(0, limit);
}

export type SuggestedPalette = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pageBgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
};

function pick(list: string[], i: number, fallback: string): string {
  return list[i] ?? list[0] ?? fallback;
}

/** Map sampled colors onto theme slots. Caller must apply — never overwrite silently. */
export function suggestThemeFromColors(colors: string[]): SuggestedPalette | null {
  const ranked = rankColors(colors);
  if (ranked.length === 0) return null;
  const dark = ranked.find((c) => {
    const n = normalizeHex(c)!;
    return (parseInt(n.slice(1, 3), 16) + parseInt(n.slice(3, 5), 16) + parseInt(n.slice(5, 7), 16)) / 3 < 80;
  });
  const light = ranked.find((c) => {
    const n = normalizeHex(c)!;
    return (parseInt(n.slice(1, 3), 16) + parseInt(n.slice(3, 5), 16) + parseInt(n.slice(5, 7), 16)) / 3 > 180;
  });
  const accent = ranked.find((c) => saturation(c) > 0.25) ?? ranked[0];
  return {
    primaryColor: dark ?? pick(ranked, 0, "#12171f"),
    secondaryColor: pick(ranked, 1, "#2a3340"),
    accentColor: accent,
    pageBgColor: dark ?? "#0b0f15",
    surfaceColor: pick(ranked, Math.min(2, ranked.length - 1), "#1a212c"),
    textColor: light ?? "#f8fafc",
    mutedTextColor: pick(ranked, Math.min(3, ranked.length - 1), "#a3aed0"),
  };
}
