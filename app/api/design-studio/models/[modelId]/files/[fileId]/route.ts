import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, serverError, unauthorized } from "@/lib/server/api-response";
import { deleteModelFile } from "@/lib/design-studio/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

/** DELETE /api/design-studio/models/[modelId]/files/[fileId] */
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string; fileId: string }> },
) => {
  const { modelId, fileId } = await params;
  return withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const file = await deleteModelFile(admin, fileId, modelId);
      if (file.s3_key) await deleteS3Objects([file.s3_key]);
      const recovered = Number(file.file_size_bytes) || 0;
      if (recovered > 0) await recoverOrgStorage(orgId, recovered);
      return ok({ success: true, fileId: file.id });
    } catch (err: unknown) {
      console.error("[DELETE .../files/:fileId]", err);
      return serverError("Failed to delete file");
    }
  });
};
