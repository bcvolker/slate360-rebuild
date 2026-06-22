/**
 * Punch-list item photos.
 *
 * POST /api/projects/[projectId]/punch-list/photo
 *   Body: { filename, contentType }
 *   → presigned S3 PUT URL the client uploads the image to directly, plus a stable
 *     `serveUrl` (this same route, GET ?key=…) to store in project_punch_items.photos[].
 *
 * GET /api/projects/[projectId]/punch-list/photo?key=…
 *   → 302 redirect to a presigned GET URL so <img src> can render a private-bucket
 *     object without exposing S3 credentials. Mirrors the site-walk item image route.
 */
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";
import { s3, BUCKET, buildS3Key } from "@/lib/s3";

const punchFolder = (projectId: string) => `punch/${projectId}`;

export const POST = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ projectId, orgId }) => {
    if (!orgId) return forbidden("No organization");

    const body = (await req.json().catch(() => ({}))) as { filename?: string; contentType?: string };
    const filename = (body.filename ?? "").trim();
    const contentType = (body.contentType ?? "").trim();
    if (!filename || !contentType) return badRequest("filename and contentType are required");
    if (!contentType.startsWith("image/")) return badRequest("Only image files are allowed");

    try {
      const key = buildS3Key(orgId, punchFolder(projectId), filename);
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
        { expiresIn: 900 },
      );
      const serveUrl = `/api/projects/${projectId}/punch-list/photo?key=${encodeURIComponent(key)}`;
      return ok({ uploadUrl, serveUrl, key });
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to sign upload");
    }
  });

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ projectId, orgId }) => {
    if (!orgId) return forbidden("No organization");

    const key = req.nextUrl.searchParams.get("key");
    if (!key) return badRequest("key is required");

    // IDOR guard: the key must live under this org + project's punch namespace.
    const expectedPrefix = `orgs/${orgId}/${punchFolder(projectId)}/`;
    if (!key.startsWith(expectedPrefix)) return notFound("Photo not found");

    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 3600 },
      );
      return NextResponse.redirect(url);
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to load photo");
    }
  });
