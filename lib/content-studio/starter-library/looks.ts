import type { StarterLibraryItem } from "./types";

const BASE = {
  assetType: "look" as const,
  category: "Looks",
  license: "MIT / CC0",
  dropTarget: "color_inspector" as const,
  gapsClosed: ["Apply Look / preset", "LUT / look as effect"],
};

/** Color look presets — `.cube` paths filled after R2 ingest; preview uses lookJson now. */
export const STARTER_LOOKS: StarterLibraryItem[] = [
  { ...BASE, id: "look-neutral-clean", name: "Neutral Clean", sourceUrl: "https://github.com/mrdoob/three.js/tree/master/examples/luts", metadata: { group: "neutral", cube: "library/looks/neutral-clean.cube" }, lookJson: { exposure: 0, contrast: 1.05, saturation: 1, temperature: 0 } },
  { ...BASE, id: "look-site-bright", name: "Site Bright", metadata: { group: "neutral" }, lookJson: { exposure: 0.15, contrast: 1.1, saturation: 1.05, temperature: 200 } },
  { ...BASE, id: "look-report-flat", name: "Report Flat", metadata: { group: "neutral" }, lookJson: { exposure: 0, contrast: 0.95, saturation: 0.9, temperature: 0 } },
  { ...BASE, id: "look-overcast", name: "Overcast Recover", metadata: { group: "neutral" }, lookJson: { exposure: 0.2, contrast: 0.9, saturation: 0.85, temperature: -100 } },
  { ...BASE, id: "look-golden-hour", name: "Golden Hour", metadata: { group: "warm" }, lookJson: { exposure: 0.05, contrast: 1.08, saturation: 1.12, temperature: 450 } },
  { ...BASE, id: "look-construction-warm", name: "Construction Warm", metadata: { group: "warm" }, lookJson: { exposure: 0, contrast: 1.12, saturation: 1.08, temperature: 350 } },
  { ...BASE, id: "look-interior-tungsten", name: "Interior Tungsten", metadata: { group: "warm" }, lookJson: { exposure: 0.1, contrast: 1.05, saturation: 1, temperature: 500 } },
  { ...BASE, id: "look-sunset-glow", name: "Sunset Glow", metadata: { group: "warm" }, lookJson: { exposure: -0.05, contrast: 1.15, saturation: 1.2, temperature: 600 } },
  { ...BASE, id: "look-social-punch", name: "Social Punch", metadata: { group: "social" }, lookJson: { exposure: 0.05, contrast: 1.25, saturation: 1.25, temperature: 150 } },
  { ...BASE, id: "look-reels-vivid", name: "Reels Vivid", metadata: { group: "social" }, lookJson: { exposure: 0, contrast: 1.2, saturation: 1.35, temperature: 100 } },
  { ...BASE, id: "look-high-contrast", name: "High Contrast", metadata: { group: "social" }, lookJson: { exposure: -0.05, contrast: 1.35, saturation: 1.1, temperature: 0 } },
  { ...BASE, id: "look-teal-orange", name: "Teal & Orange", metadata: { group: "social" }, lookJson: { exposure: 0, contrast: 1.18, saturation: 1.15, temperature: 250, tint: -5 } },
  { ...BASE, id: "look-mono-report", name: "Mono Report", metadata: { group: "bw" }, lookJson: { exposure: 0, contrast: 1.1, saturation: 0, temperature: 0 } },
  { ...BASE, id: "look-mono-high", name: "Mono High Key", metadata: { group: "bw" }, lookJson: { exposure: 0.2, contrast: 1.05, saturation: 0, temperature: 0 } },
  { ...BASE, id: "look-mono-dramatic", name: "Mono Dramatic", metadata: { group: "bw" }, lookJson: { exposure: -0.1, contrast: 1.4, saturation: 0, temperature: 0 } },
  { ...BASE, id: "look-mono-soft", name: "Mono Soft", metadata: { group: "bw" }, lookJson: { exposure: 0.1, contrast: 0.85, saturation: 0, temperature: 0 } },
];
