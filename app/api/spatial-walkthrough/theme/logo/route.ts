import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { uploadBuffer } from "@/lib/s3-utils";
import { isAllowedLogoMime, logoExtension, sanitizeSvg, svgLooksUnsafe } from "@/lib/spatial-walkthrough/sanitize-svg";

export const runtime = "nodejs";

const MAX_BYTES = 1.5 * 1024 * 1024;

function logoHeaders(contentType: string, body: unknown, extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Content-Type", contentType);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, max-age=120");
  if (contentType.includes("svg")) headers.set("Content-Security-Policy", "sandbox");
  return new NextResponse(body as never, { status: 200, headers });
}

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { data } = await admin.from("spatial_org_themes").select("logo_display_key, logo_key").eq("org_id", orgId).maybeSingle();
    const key = data?.logo_display_key || data?.logo_key;
    if (!key) return notFound("No logo");
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const type = obj.ContentType || (key.endsWith(".svg") ? "image/svg+xml" : "image/png");
    return logoHeaders(type, obj.Body);
  }, "view");

export const POST = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("file is required");
    if (file.size > MAX_BYTES) return badRequest("Logo must be under 1.5MB");
    if (!isAllowedLogoMime(file.type, file.name)) return badRequest("Use SVG, PNG, or WebP");

    const ext = logoExtension(file.type, file.name);
    const raw = Buffer.from(await file.arrayBuffer());
    let original = raw;
    let display = raw;
    let displayType = ext === "svg" ? "image/svg+xml" : ext === "webp" ? "image/webp" : "image/png";

    if (ext === "svg") {
      const text = raw.toString("utf8");
      const sanitized = sanitizeSvg(text);
      if (!sanitized.ok) return badRequest(sanitized.error);
      display = Buffer.from(sanitized.svg, "utf8");
      original = svgLooksUnsafe(text) ? display : raw;
    }

    const originalKey = `orgs/${orgId}/spatial-walkthrough/brand/logo-original.${ext}`;
    const displayKey = `orgs/${orgId}/spatial-walkthrough/brand/logo-display.${ext}`;
    try {
      await uploadBuffer(originalKey, original, displayType);
      await uploadBuffer(displayKey, display, displayType);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Upload failed");
    }

    const payload = { org_id: orgId, logo_key: originalKey, logo_display_key: displayKey, updated_at: new Date().toISOString() };
    const { error } = await admin.from("spatial_org_themes").upsert(payload);
    if (error) return serverError(error.message);
    return ok({ logoUrl: "/api/spatial-walkthrough/theme/logo", originalKey, displayKey });
  }, "author");
