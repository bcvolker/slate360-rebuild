import type { StarterLibraryItem } from "./types";

const BASE = {
  assetType: "preset" as const,
  category: "Caption Styles",
  license: "Slate360 (MIT)",
  dropTarget: "titles_lane" as const,
  gapsClosed: ["Caption style presets", "Burn-in captions"],
};

export const STARTER_CAPTION_STYLES: StarterLibraryItem[] = [
  { ...BASE, id: "cap-box-default", name: "Box Default (A11y)", metadata: { kind: "caption_style", fontFamily: "Inter", fontSize: 42, textColor: "#FFFFFF", bgColor: "#000000", bgOpacity: 0.75, position: "bottom" } },
  { ...BASE, id: "cap-outline-bold", name: "Bold Outline", metadata: { kind: "caption_style", fontFamily: "Inter", fontSize: 44, textColor: "#FFFFFF", strokeColor: "#000000", strokeWidth: 3, position: "bottom" } },
  { ...BASE, id: "cap-minimal", name: "Minimal White", metadata: { kind: "caption_style", fontFamily: "Inter", fontSize: 38, textColor: "#F8FAFC", bgOpacity: 0, position: "bottom" } },
  { ...BASE, id: "cap-branded-teal", name: "Branded Teal", metadata: { kind: "caption_style", fontFamily: "Inter", fontSize: 40, textColor: "#00E699", bgColor: "#0B0F15", bgOpacity: 0.85, position: "bottom" } },
  { ...BASE, id: "cap-top-bar", name: "Top Bar", metadata: { kind: "caption_style", fontFamily: "Inter", fontSize: 36, textColor: "#FFFFFF", bgColor: "#000000", bgOpacity: 0.6, position: "top" } },
  { ...BASE, id: "cap-karaoke", name: "Karaoke Highlight", metadata: { kind: "caption_style", fontFamily: "Inter", fontSize: 42, textColor: "#FFFFFF", highlightColor: "#3D8EFF", bgOpacity: 0.5, position: "bottom" } },
];
