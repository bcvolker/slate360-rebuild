import { PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET, s3 } from "@/lib/s3";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProjectArtifactKind =
  | "RFI"
  | "Submittal"
  | "PunchList"
  | "DailyLog"
  | "Budget"
  | "Schedule"
  | "Closeout";

const ARTIFACT_FOLDER_MAP: Record<ProjectArtifactKind, string> = {
  RFI: "RFIs",
  Submittal: "Submittals",
  PunchList: "Reports",
  DailyLog: "Daily Logs",
  Budget: "Budget",
  Schedule: "Schedule",
  Closeout: "Closeout",
};

export function resolveArtifactFolder(kind: ProjectArtifactKind): string {
  return ARTIFACT_FOLDER_MAP[kind];
}

export async function resolveProjectFolderIdByName(projectId: string, folderName: string, orgId: string | null, userId: string) {
  const admin = createAdminClient();

  let query = admin
    .from("project_folders")
    .select("id")
    .eq("parent_id", projectId)
    .eq("name", folderName)
    .limit(1);

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", userId);

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
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
  projectName: string,
  kind: ProjectArtifactKind,
  file: UploadableArtifactFile,
  user: ArtifactUser,
  orgId: string | null
) {
  const admin = createAdminClient();

  const folderName = resolveArtifactFolder(kind);
  const namespace = resolveNamespace(orgId, user.id);
  const folderToken = `Projects/${projectName}/${folderName}`;
  const s3Key = buildCanonicalS3Key(namespace, folderToken, file.name);

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
      file_name: file.name,
      file_size: file.size ?? body.byteLength,
      file_type: extFromFilename(file.name),
      s3_key: s3Key,
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
