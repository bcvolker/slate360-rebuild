import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, badRequest, forbidden } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const dynamic = "force-dynamic";

// POST /api/content-studio/media/presign — presigned R2 PUT URL for a source upload.
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: { editProjectId?: string; filename?: string; contentType?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    const filename = (body.filename ?? "").trim();
    if (!filename) return badRequest("filename required");
    const editProjectId = body.editProjectId ?? "scratch";
    const contentType = body.contentType || "application/octet-stream";

    const safe = filename.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
    const storageKey = `orgs/${orgId}/Content Studio/Raw/${editProjectId}/${Date.now()}_${safe}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: storageKey, ContentType: contentType }),
      { expiresIn: 3600 },
    );

    return ok({ uploadUrl, storageKey, contentType });
  });
