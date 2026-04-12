import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { createModelFile } from "@/lib/design-studio/queries";

export const runtime = "nodejs";

/** POST /api/design-studio/models/[modelId]/files/complete — finalize file upload */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> },
) => {
  const { modelId } = await params;
  return withAppAuth("design_studio", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const body = await req.json();
      const { filename, s3Key, contentType, size, fileRole } = body as {
        filename: string;
        s3Key: string;
        contentType: string;
        size: number;
        fileRole?: string;
      };

      if (!filename || !s3Key || !contentType || typeof size !== "number") {
        return badRequest("Missing required fields");
      }

      const file = await createModelFile(admin, {
        modelId,
        filename,
        s3Key,
        contentType,
        fileSizeBytes: size,
        fileRole,
      });

      // Increment storage quota
      const { error: rpcError } = await admin.rpc("increment_org_storage", {
        target_org_id: orgId,
        bytes_delta: size,
      });

      if (rpcError) {
        console.error("[POST .../files/complete] Failed to increment quota:", rpcError);
      }

      return ok(file);
    } catch (err: unknown) {
      console.error("[POST .../files/complete]", err);
      return serverError("Failed to complete file upload");
    }
  });
};
