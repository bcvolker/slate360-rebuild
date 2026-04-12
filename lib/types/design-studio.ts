/** Shared types for the Design Studio module. */

export type ModelStatus = "draft" | "active" | "archived";
export type ModelType = "generic" | "bim" | "scan" | "cad";
export type FileRole = "primary" | "alternate" | "texture" | "reference";

export interface ProjectModel {
  id: string;
  orgId: string;
  projectId: string;
  createdBy: string;
  title: string;
  description: string | null;
  status: ModelStatus;
  modelType: ModelType;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelFile {
  id: string;
  modelId: string;
  filename: string;
  s3Key: string;
  contentType: string;
  fileSizeBytes: number;
  fileRole: FileRole;
  sortOrder: number;
  createdAt: string;
}
