import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { s3, BUCKET, buildS3Key } from "@/lib/s3";

// POST /api/design-studio/upload-image — presigned PUT for a drag-dropped
// inspiration/reference image. Returns { uploadUrl, key }.
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: { filename?: string; contentType?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    if (!body.filename || !body.contentType) return badRequest("filename and contentType are required");
    if (!body.contentType.startsWith("image/")) return badRequest("Only images are allowed");

    try {
      const key = buildS3Key(orgId, "design-studio/refs", body.filename);
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: body.contentType }),
        { expiresIn: 900 },
      );
      return ok({ uploadUrl, key });
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to sign upload");
    }
  });
