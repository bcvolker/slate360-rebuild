export type TourStatus = "draft" | "published";
export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface ProjectTour {
  id: string;
  orgId: string;
  projectId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  status: TourStatus;
  viewerSlug: string | null;
  logoAssetPath: string | null;
  logoWidthPercent: number | null;
  logoOpacity: number | null;
  logoPosition: LogoPosition | null;
  createdAt: string;
  updatedAt: string;
}

export interface TourScene {
  id: string;
  tourId: string;
  sortOrder: number;
  title: string;
  panoramaPath: string;
  thumbnailPath: string | null;
  fileSizeBytes: number;
  initialYaw: number | null;
  initialPitch: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Public-viewer runtime shapes — server-resolved, signed-URL forms of the
 * private data above. Never pass raw storage keys to a client component;
 * these are what the public /tours/view/[slug] route actually renders.
 */

export type SceneTileManifestRuntime = {
  sourceWidth: number;
  sourceHeight: number;
  tileSize: number;
  cols: number;
  rows: number;
  /** Signed URL for the low-res full-panorama fallback (instant first paint). */
  baseUrl: string;
  /** Signed URLs, row-major: tileUrls[row * cols + col]. */
  tileUrls: string[];
};

export type SceneRuntime = {
  id: string;
  title: string;
  sortOrder: number;
  initialYaw: number;
  initialPitch: number;
  thumbnailUrl: string | null;
  /** Preferred rendering path when the tile pyramid is ready. */
  tiles: SceneTileManifestRuntime | null;
  /** Fallback (normalized or original derivative) when tiles aren't ready yet. */
  fallbackImageUrl: string | null;
};

export type PublicTourSceneSummary = {
  id: string;
  title: string;
  sortOrder: number;
  thumbnailUrl: string | null;
};

export type PublicPlanPin = {
  id: string;
  sheetId: string;
  sceneId: string;
  xPct: number;
  yPct: number;
  pinNumber: number;
  title: string | null;
};

export type PublicPlanSheet = {
  id: string;
  sheetNumber: number;
  sheetName: string | null;
  imageUrl: string | null;
  width: number;
  height: number;
};

export type PublicPlanTour = {
  sheets: PublicPlanSheet[];
  pins: PublicPlanPin[];
};

export type PublicTourSummary = {
  id: string;
  title: string;
  description: string | null;
  branding: {
    logoUrl: string | null;
    logoPosition: LogoPosition | null;
    logoOpacity: number | null;
    logoWidthPercent: number | null;
  };
  scenes: PublicTourSceneSummary[];
  /** Present only when the tour is anchored to a plan set — the plan-sheet
   * tour recipient experience (full-bleed sheet + pins + cinematic dive)
   * replaces the plain scene carousel when this is set. */
  planTour: PublicPlanTour | null;
};
