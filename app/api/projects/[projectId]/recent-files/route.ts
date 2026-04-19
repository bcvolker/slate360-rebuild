import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok } from "@/lib/server/api-response";
import { resolveNamespace } from "@/lib/slatedrop/storage";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  return withProjectAuth(req, context, async ({ admin, orgId, projectId, user }) => {
    const { data: folders, error: folderError } = await admin
      .from("project_folders")
      .select("id")
      .eq("project_id", projectId)
      .order("name", { ascending: true });

    if (folderError) {
      console.error("[api/projects/:projectId/recent-files] folder query failed", folderError.message);
      return ok({ files: [] });
    }

    const folderIds = (folders ?? []).map((folder) => folder.id).filter(Boolean);
    if (folderIds.length === 0) {
      return ok({ files: [] });
    }

    const namespace = resolveNamespace(orgId, user.id);
    const filters = folderIds.map((folderId) => `s3_key.like.${escapeLike(`orgs/${namespace}/${folderId}/`)}%`);

    let query = admin
      .from("slatedrop_uploads")
      .select("id, file_name, file_type, file_size, created_at, s3_key")
      .eq("status", "active")
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(5);

    query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);

    const { data: files, error: filesError } = await query;
    if (filesError) {
      console.error("[api/projects/:projectId/recent-files] upload query failed", filesError.message);
      return ok({ files: [] });
    }

    return ok({
      files: (files ?? []).map((file) => ({
        id: file.id,
        name: file.file_name,
        type: file.file_type,
        size: file.file_size,
        createdAt: file.created_at,
        s3Key: file.s3_key,
      })),
    });
  });
}
