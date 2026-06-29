/**
 * Canonical numbered project folder taxonomy (SlateDrop).
 *
 * Auto-provisioned on project creation. Site Walk captures route into
 * 02_Site_Walk/*; Twin assets route into 03_Digital_Twin/*.
 */
export type TaxonomyFolderNode = {
  name: string;
  folderType: string;
  /**
   * The app this branch belongs to (matches the modular `AppId` keys, e.g.
   * "site_walk" / "digital_twin"). Only present on app-owned roots; shared roots
   * (Project_Info / PM_Documents / Team_Shared) omit it and always provision.
   * Provisioning skips an app branch the org isn't subscribed to.
   */
  app?: string;
  children?: readonly TaxonomyFolderNode[];
};

export const PROJECT_FOLDER_TAXONOMY = [
  {
    name: "01_Project_Info",
    folderType: "project_info",
    children: [
      { name: "Contracts", folderType: "contracts" },
      { name: "Drawings", folderType: "drawings" },
      { name: "Permits", folderType: "permits" },
      { name: "Specs", folderType: "specs" },
      { name: "Insurance", folderType: "insurance" },
    ],
  },
  {
    name: "02_Site_Walk",
    folderType: "site_walk",
    app: "site_walk",
    children: [
      { name: "Photos", folderType: "site_walk_photos" },
      { name: "Notes", folderType: "site_walk_notes" },
      { name: "Voice_Memos", folderType: "site_walk_voice_memos" },
      { name: "Plans", folderType: "site_walk_plans" },
      { name: "Deliverables", folderType: "site_walk_deliverables" },
      { name: "Data", folderType: "site_walk_data" },
    ],
  },
  {
    name: "03_Digital_Twin",
    folderType: "digital_twin",
    app: "digital_twin",
    children: [
      { name: "Clips", folderType: "twin_clips" },
      { name: "LiDAR", folderType: "twin_lidar" },
      { name: "Models", folderType: "twin_models" },
      { name: "Source_Assets", folderType: "twin_source_assets" },
      { name: "Deliverables", folderType: "twin_deliverables" },
    ],
  },
  {
    name: "04_PM_Documents",
    folderType: "pm_documents",
    children: [
      { name: "RFIs", folderType: "rfis" },
      { name: "Submittals", folderType: "submittals" },
      { name: "Schedule", folderType: "schedule" },
      { name: "Budget", folderType: "budget" },
      { name: "Daily_Logs", folderType: "daily_logs" },
      { name: "Reports", folderType: "reports" },
      { name: "Records", folderType: "records" },
      { name: "Safety", folderType: "safety" },
      { name: "Correspondence", folderType: "correspondence" },
      { name: "Closeout", folderType: "closeout" },
    ],
  },
  {
    name: "05_Team_Shared",
    folderType: "team_shared",
    children: [
      { name: "Uploads", folderType: "team_uploads" },
      { name: "Shared_Links", folderType: "team_shared_links" },
    ],
  },
] as const satisfies readonly TaxonomyFolderNode[];

/** Site Walk capture → taxonomy subfolder under 02_Site_Walk. */
export type SiteWalkCaptureFolder =
  | "Photos"
  | "Notes"
  | "Voice_Memos"
  | "Plans"
  | "Deliverables"
  | "Data";

/** Twin asset → taxonomy subfolder under 03_Digital_Twin. */
export type TwinAssetFolder = "Clips" | "LiDAR" | "Models" | "Source_Assets" | "Deliverables";

export const SITE_WALK_ROOT = "02_Site_Walk" as const;
export const TWIN_ROOT = "03_Digital_Twin" as const;
export const PM_ROOT = "04_PM_Documents" as const;

/** Legacy flat folder names from pre-taxonomy provisioning. */
export const LEGACY_PM_FOLDER_NAMES = [
  "Documents",
  "Drawings",
  "Photos",
  "3D Models",
  "360 Tours",
  "RFIs",
  "Submittals",
  "Schedule",
  "Budget",
  "Daily Logs",
  "Reports",
  "Records",
  "Safety",
  "Correspondence",
  "Closeout",
  "Deliverables",
  "Misc",
] as const;

/** Maps legacy PM artifact folder labels to numbered taxonomy paths. */
export const LEGACY_ARTIFACT_FOLDER_PATHS: Record<string, readonly string[]> = {
  RFIs: [PM_ROOT, "RFIs"],
  Submittals: [PM_ROOT, "Submittals"],
  Schedule: [PM_ROOT, "Schedule"],
  Budget: [PM_ROOT, "Budget"],
  "Daily Logs": [PM_ROOT, "Daily_Logs"],
  Reports: [PM_ROOT, "Reports"],
  Records: [PM_ROOT, "Records"],
  Safety: [PM_ROOT, "Safety"],
  Correspondence: [PM_ROOT, "Correspondence"],
  Closeout: [PM_ROOT, "Closeout"],
  Drawings: ["01_Project_Info", "Drawings"],
  Documents: ["01_Project_Info", "Contracts"],
};

export function siteWalkFolderPath(child: SiteWalkCaptureFolder): readonly string[] {
  return [SITE_WALK_ROOT, child];
}

export function twinAssetFolderPath(child: TwinAssetFolder): readonly string[] {
  return [TWIN_ROOT, child];
}

export function inferTwinAssetFolder(assetKind: string, fileName: string): TwinAssetFolder {
  const kind = assetKind.toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (kind === "video" || ext === "mp4" || ext === "mov" || ext === "webm") return "Clips";
  if (ext === "spz" || kind.includes("model") || kind.includes("splat")) return "Models";
  // LiDAR / depth / point-cloud / mesh scans get their own section.
  if (
    kind.includes("lidar") ||
    kind.includes("ply") ||
    kind.includes("mesh") ||
    ["ply", "las", "laz", "e57", "pcd", "xyz", "pts", "obj", "glb", "gltf", "fbx", "stl"].includes(ext)
  ) {
    return "LiDAR";
  }
  return "Source_Assets";
}
