import { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

const IMAGE_TYPES = ["jpg", "jpeg", "jpe", "tif", "tiff", "png"];

function signKey(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

/**
 * Lists a project's SlateDrop image files (across its folders) so they can be
 * imported into a thermal session without re-uploading.
 */
export const GET = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId || !orgId) return ok({ files: [] });

    const { data: folders, error: folderError } = await admin
      .from("project_folders")
      .select("id, name")
      .eq("project_id", projectId)
      .eq("org_id", orgId);
    if (folderError) return serverError(folderError.message);

    const folderRows = folders ?? [];
    const folderIds = folderRows.map((f) => f.id);
    const folderName = new Map(folderRows.map((f) => [f.id as string, (f.name as string) ?? "Folder"]));
    if (!folderIds.length) return ok({ files: [], folders: [] });

    const { data: files, error } = await admin
      .from("slatedrop_uploads")
      .select("id, file_name, file_size, file_type, s3_key, folder_id")
      .eq("org_id", orgId)
      .eq("status", "active")
      .in("folder_id", folderIds)
      .in("file_type", IMAGE_TYPES)
      .order("file_name", { ascending: true });
    if (error) return serverError(error.message);

    // Sign thumbnails (cap to keep the response fast) so the grid can show previews.
    const rows = files ?? [];
    const withPreviews = await Promise.all(
      rows.map(async (f, i) => ({
        ...f,
        folder_name: folderName.get(f.folder_id as string) ?? "Folder",
        previewUrl: i < 300 && f.s3_key ? await signKey(f.s3_key as string) : null,
      })),
    );

    // Only return folders that actually contain images, with counts.
    const counts = new Map<string, number>();
    for (const f of rows) counts.set(f.folder_id as string, (counts.get(f.folder_id as string) ?? 0) + 1);
    const foldersOut = folderRows
      .filter((f) => counts.has(f.id as string))
      .map((f) => ({ id: f.id as string, name: (f.name as string) ?? "Folder", count: counts.get(f.id as string) ?? 0 }));

    return ok({ files: withPreviews, folders: foldersOut });
  });
