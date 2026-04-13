import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

/** POST /api/site-walk/upload — returns a presigned PUT URL for photo/file upload */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = await req.json();
    const { filename, contentType, sessionId } = body as {
      filename?: string;
      contentType?: string;
      sessionId?: string;
    };

    if (!filename || !contentType || !sessionId) {
      return badRequest("filename, contentType, and sessionId are required");
    }

    // Validate content type (images + common docs)
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowed.includes(contentType)) {
      return badRequest("Unsupported file type");
    }

    const ext = filename.split(".").pop() ?? "jpg";
    const ts = Date.now();
    const key = `site-walk/photos/${orgId}/${sessionId}/${ts}-${user.id.slice(0, 8)}.${ext}`;

    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min

      return ok({ uploadUrl, s3Key: key });
    } catch (err) {
      console.error("[site-walk-upload]", err);
      return serverError("Failed to generate upload URL");
    }
  });
