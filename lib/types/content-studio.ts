/** Shared types for the Content Studio module. */

export type MediaType = "image" | "video" | "document" | "audio";

export interface MediaCollection {
  id: string;
  orgId: string;
  projectId: string;
  createdBy: string;
  title: string;
  description: string | null;
  coverPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  orgId: string;
  collectionId: string | null;
  uploadedBy: string;
  title: string;
  s3Key: string;
  contentType: string;
  fileSizeBytes: number;
  mediaType: MediaType;
  width: number | null;
  height: number | null;
  durationSecs: number | null;
  thumbnailPath: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
