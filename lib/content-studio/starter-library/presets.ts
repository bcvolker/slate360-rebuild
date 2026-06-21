import type { StarterLibraryItem } from "./types";

const BASE = {
  assetType: "preset" as const,
  category: "Presets",
  license: "Slate360 (MIT)",
  dropTarget: "export_preset" as const,
  gapsClosed: ["Export aspect presets", "Branded export presets"],
};

export const STARTER_EXPORT_PRESETS: StarterLibraryItem[] = [
  { ...BASE, id: "exp-youtube-16x9", name: "YouTube 1080p 16:9", metadata: { aspect: "master_16x9", width: 1920, height: 1080, fps: 30, codec: "h264", crf: 22 } },
  { ...BASE, id: "exp-reels-9x16", name: "Reels / TikTok 9:16", metadata: { aspect: "portrait_9x16", width: 1080, height: 1920, fps: 30, codec: "h264", crf: 23 } },
  { ...BASE, id: "exp-square-1x1", name: "Square Feed 1:1", metadata: { aspect: "square_1x1", width: 1080, height: 1080, fps: 30, codec: "h264", crf: 23 } },
  { ...BASE, id: "exp-feed-4x5", name: "Instagram 4:5", metadata: { aspect: "portrait_4x5", width: 1080, height: 1350, fps: 30, codec: "h264", crf: 23 } },
  { ...BASE, id: "exp-review-720", name: "Review 720p", metadata: { aspect: "review_720p", width: 1280, height: 720, fps: 24, codec: "h264", crf: 26 } },
  { ...BASE, id: "exp-client-report", name: "Client Report 1080p", metadata: { aspect: "master_16x9", width: 1920, height: 1080, fps: 24, codec: "h264", crf: 20, burnLogo: true, burnCaptions: false } },
];

export const STARTER_FONTS: StarterLibraryItem[] = [
  { id: "font-inter", assetType: "preset", category: "Fonts", name: "Inter", license: "OFL", sourceUrl: "https://fonts.google.com/specimen/Inter", dropTarget: "titles_lane", gapsClosed: ["Font family"], metadata: { kind: "font", family: "Inter", weights: [400, 600, 700] } },
  { id: "font-orbitron", assetType: "preset", category: "Fonts", name: "Orbitron", license: "OFL", sourceUrl: "https://fonts.google.com/specimen/Orbitron", dropTarget: "titles_lane", gapsClosed: ["Font family"], metadata: { kind: "font", family: "Orbitron", weights: [500, 700] } },
  { id: "font-roboto", assetType: "preset", category: "Fonts", name: "Roboto", license: "OFL", sourceUrl: "https://fonts.google.com/specimen/Roboto", dropTarget: "titles_lane", gapsClosed: ["Font family"], metadata: { kind: "font", family: "Roboto", weights: [400, 500, 700] } },
  { id: "font-open-sans", assetType: "preset", category: "Fonts", name: "Open Sans", license: "OFL", sourceUrl: "https://fonts.google.com/specimen/Open+Sans", dropTarget: "titles_lane", gapsClosed: ["Font family"], metadata: { kind: "font", family: "Open Sans", weights: [400, 600] } },
];
