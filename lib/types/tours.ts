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
  initialYaw: number | null;
  initialPitch: number | null;
  createdAt: string;
  updatedAt: string;
}
