import { PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";
import { buildCanonicalAssetFilename } from "@/lib/slatedrop/canonical-filename";
import { resolveProjectFolderIdByName } from "@/lib/slatedrop/folder-resolver";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export { resolveProjectFolderIdByName } from "@/lib/slatedrop/folder-resolver";

export type ProjectArtifactKind =
  | "RFI"
  | "Submittal"
  | "PunchList"
  | "DailyLog"
  | "PhotoReport"
  | "Budget"
  | "Schedule"
  | "Closeout"
  | "Observation";

const ARTIFACT_FOLDER_MAP: Record<ProjectArtifactKind, string> = {
  RFI: "RFIs",
  Submittal: "Submittals",
  PunchList: "Reports",
  DailyLog: "Daily Logs",
  PhotoReport: "Reports",
  Budget: "Budget",
  Schedule: "Schedule",
  Closeout: "Closeout",
  Observation: "Records",
};

export function resolveArtifactFolder(kind: ProjectArtifactKind): string {
  return ARTIFACT_FOLDER_MAP[kind];
}

type UploadableArtifactFile = {
  name: string;
  type?: string;
  size?: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type ArtifactUser = {
  id: string;
};

function extFromFilename(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function saveProjectArtifact(
  projectId: string,
  _projectName: string,
  kind: ProjectArtifactKind,
  file: UploadableArtifactFile,
  user: ArtifactUser,
  orgId: string | null
) {
  const admin = createAdminClient();

  const folderName = resolveArtifactFolder(kind);
  const folderId = await resolveProjectFolderIdByName(projectId, folderName, orgId, user.id);
  if (!folderId) {
    throw new Error(`Project folder not found for artifact kind: ${kind}`);
  }

  const namespace = resolveNamespace(orgId, user.id);
  const artifactId = crypto.randomUUID();
  const canonicalName = buildCanonicalAssetFilename({
    type: "Document",
    id: artifactId,
    ext: extFromFilename(file.name),
  });
  const s3Key = buildCanonicalS3Key(namespace, folderId, canonicalName);

  const body = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    })
  );

  const { data, error } = await admin
    .from("slatedrop_uploads")
    .insert({
      file_name: canonicalName,
      file_size: file.size ?? body.byteLength,
      file_type: extFromFilename(file.name),
      s3_key: s3Key,
      folder_id: folderId,
      org_id: orgId,
      uploaded_by: user.id,
      status: "active",
    })
    .select("id, file_name, file_size, file_type, s3_key, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    upload: data,
    folderName,
    s3Key,
  };
}
