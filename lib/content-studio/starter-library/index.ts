import { STARTER_CAPTION_STYLES } from "./caption-styles";
import { STARTER_LOOKS } from "./looks";
import { STARTER_SFX, STARTER_MUSIC } from "./audio";
import { STARTER_EXPORT_PRESETS, STARTER_FONTS } from "./presets";
import { STARTER_TITLE_TEMPLATES } from "./title-templates";
import { STARTER_TRANSITIONS } from "./transitions";
import type { StarterCatalog, StarterLibraryItem } from "./types";

export const STARTER_LIBRARY_VERSION = "2026.06.20";

export const ALL_STARTER_ITEMS: StarterLibraryItem[] = [
  ...STARTER_TRANSITIONS,
  ...STARTER_MUSIC,
  ...STARTER_SFX,
  ...STARTER_TITLE_TEMPLATES,
  ...STARTER_LOOKS,
  ...STARTER_FONTS,
  ...STARTER_CAPTION_STYLES,
  ...STARTER_EXPORT_PRESETS,
];

const CATEGORY_ORDER = [
  "Transitions",
  "Music",
  "Sound FX",
  "Titles",
  "Logos / Brand",
  "Looks",
  "Fonts",
  "Caption Styles",
  "Presets",
];

export function buildStarterCatalog(): StarterCatalog {
  const counts = new Map<string, number>();
  for (const item of ALL_STARTER_ITEMS) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return {
    version: STARTER_LIBRARY_VERSION,
    items: ALL_STARTER_ITEMS,
    categories: CATEGORY_ORDER.map((label) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label,
      count: counts.get(label) ?? 0,
    })),
  };
}

export function itemsByCategory(category: string): StarterLibraryItem[] {
  return ALL_STARTER_ITEMS.filter((i) => i.category === category);
}

export function getStarterItem(id: string): StarterLibraryItem | undefined {
  return ALL_STARTER_ITEMS.find((i) => i.id === id);
}

export * from "./types";
export { STARTER_TRANSITIONS, STARTER_LOOKS, STARTER_TITLE_TEMPLATES, STARTER_CAPTION_STYLES, STARTER_SFX, STARTER_MUSIC, STARTER_EXPORT_PRESETS, STARTER_FONTS };
