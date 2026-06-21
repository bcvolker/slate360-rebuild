import type { StarterLibraryItem } from "./types";

const BASE = {
  assetType: "transition" as const,
  category: "Transitions",
  license: "LGPL-3.0 (FFmpeg xfade server-side)",
  sourceUrl: "https://ffmpeg.org/ffmpeg-filters.html#xfade",
  dropTarget: "cut_boundary" as const,
  gapsClosed: ["Add transition at cut", "Cross dissolve", "Wipe / Slide"],
};

/** Curated FFmpeg xfade names — metadata only; render worker applies at export. */
export const STARTER_TRANSITIONS: StarterLibraryItem[] = [
  { ...BASE, id: "xfade-fade", name: "Cross Dissolve", metadata: { xfade: "fade", durationSec: 0.8, group: "clean" } },
  { ...BASE, id: "xfade-dissolve", name: "Dissolve", metadata: { xfade: "dissolve", durationSec: 0.8, group: "clean" } },
  { ...BASE, id: "xfade-fadefast", name: "Fast Fade", metadata: { xfade: "fadefast", durationSec: 0.4, group: "clean" } },
  { ...BASE, id: "xfade-fadeslow", name: "Slow Fade", metadata: { xfade: "fadeslow", durationSec: 1.2, group: "clean" } },
  { ...BASE, id: "xfade-fadeblack", name: "Fade to Black", metadata: { xfade: "fadeblack", durationSec: 0.9, group: "dip" } },
  { ...BASE, id: "xfade-fadewhite", name: "Fade to White", metadata: { xfade: "fadewhite", durationSec: 0.9, group: "dip" } },
  { ...BASE, id: "xfade-wipeleft", name: "Wipe Left", metadata: { xfade: "wipeleft", durationSec: 0.7, group: "wipe" } },
  { ...BASE, id: "xfade-wiperight", name: "Wipe Right", metadata: { xfade: "wiperight", durationSec: 0.7, group: "wipe" } },
  { ...BASE, id: "xfade-wipeup", name: "Wipe Up", metadata: { xfade: "wipeup", durationSec: 0.7, group: "wipe" } },
  { ...BASE, id: "xfade-wipedown", name: "Wipe Down", metadata: { xfade: "wipedown", durationSec: 0.7, group: "wipe" } },
  { ...BASE, id: "xfade-slideleft", name: "Slide Left", metadata: { xfade: "slideleft", durationSec: 0.6, group: "slide" } },
  { ...BASE, id: "xfade-slideright", name: "Slide Right", metadata: { xfade: "slideright", durationSec: 0.6, group: "slide" } },
  { ...BASE, id: "xfade-slideup", name: "Slide Up", metadata: { xfade: "slideup", durationSec: 0.6, group: "slide" } },
  { ...BASE, id: "xfade-slidedown", name: "Slide Down", metadata: { xfade: "slidedown", durationSec: 0.6, group: "slide" } },
  { ...BASE, id: "xfade-smoothleft", name: "Smooth Left", metadata: { xfade: "smoothleft", durationSec: 0.8, group: "modern" } },
  { ...BASE, id: "xfade-smoothright", name: "Smooth Right", metadata: { xfade: "smoothright", durationSec: 0.8, group: "modern" } },
  { ...BASE, id: "xfade-radial", name: "Radial", metadata: { xfade: "radial", durationSec: 0.8, group: "modern" } },
  { ...BASE, id: "xfade-circleopen", name: "Circle Open", metadata: { xfade: "circleopen", durationSec: 0.8, group: "modern" } },
  { ...BASE, id: "xfade-circleclose", name: "Circle Close", metadata: { xfade: "circleclose", durationSec: 0.8, group: "modern" } },
  { ...BASE, id: "xfade-zoomin", name: "Zoom In", metadata: { xfade: "zoomin", durationSec: 0.7, group: "modern" } },
  { ...BASE, id: "xfade-pixelize", name: "Pixelize", metadata: { xfade: "pixelize", durationSec: 0.5, group: "stylized" } },
  { ...BASE, id: "xfade-hblur", name: "Horizontal Blur", metadata: { xfade: "hblur", durationSec: 0.6, group: "stylized" } },
  { ...BASE, id: "xfade-coverleft", name: "Cover Left", metadata: { xfade: "coverleft", durationSec: 0.7, group: "reveal" } },
  { ...BASE, id: "xfade-revealright", name: "Reveal Right", metadata: { xfade: "revealright", durationSec: 0.7, group: "reveal" } },
];
