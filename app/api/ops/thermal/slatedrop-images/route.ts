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
      .select("id")
      .eq("project_id", projectId)
      .eq("org_id", orgId);
    if (folderError) return serverError(folderError.message);

    const folderIds = (folders ?? []).map((f) => f.id);
    if (!folderIds.length) return ok({ files: [] });

    const { data: files, error } = await admin
      .from("slatedrop_uploads")
      .select("id, file_name, file_size, file_type, s3_key")
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
        previewUrl: i < 200 && f.s3_key ? await signKey(f.s3_key as string) : null,
      })),
    );

    return ok({ files: withPreviews });
  });
