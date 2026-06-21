/** Starter Library item — mirrors content_library_assets + static catalog rows. */
export type StarterAssetType =
  | "transition"
  | "music"
  | "sfx"
  | "title_template"
  | "logo"
  | "look"
  | "preset";

export type StarterLibraryItem = {
  id: string;
  assetType: StarterAssetType;
  category: string;
  name: string;
  description?: string;
  license: string;
  sourceUrl?: string;
  attribution?: string;
  storageKey?: string;
  metadata: Record<string, unknown>;
  lookJson?: Record<string, unknown>;
  /** Where a drag/click should land in the editor shell. */
  dropTarget: "cut_boundary" | "sfx_lane" | "music_lane" | "titles_lane" | "color_inspector" | "export_preset";
  gapsClosed: string[];
};

export type StarterCatalog = {
  version: string;
  items: StarterLibraryItem[];
  categories: { id: string; label: string; count: number }[];
};
