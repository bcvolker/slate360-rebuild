import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

export type PlanRoomProject = {
  id: string;
  name: string;
  description: string | null;
};

export type PlanRoomFolder = {
  id: string;
  name: string;
  folder_path: string;
  project_id: string;
  parent_id?: string | null;
};

export type PlanRoomPayload = {
  planSets: SiteWalkPlanSet[];
  sheets: SiteWalkPlanSheet[];
};

export type UploadStage = "idle" | "uploading" | "processing" | "complete" | "error";

export type UploadState = {
  stage: UploadStage;
  message: string;
};
