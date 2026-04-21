import { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadBuffer } from "@/lib/s3-utils";
import { s3, BUCKET } from "@/lib/s3";

type AssetType = "logo" | "signature";

function isAssetType(value: unknown): value is AssetType {
  return value === "logo" || value === "signature";
}

/**
 * POST /api/site-walk/branding
 *
 * Multipart upload for org branding assets (logo + signature).
 *
 * Form fields:
 *   - file (preferred) or logo (legacy alias) — image, ≤2 MB
 *   - type (optional) — "logo" | "signature" (default "logo")
 *
 * Side effects:
 *   - Uploads to s3://.../site-walk/branding/{orgId}/{type}.{ext}
 *   - For logo: also updates legacy `organizations.deliverable_logo_s3_key`
 *   - Updates `organizations.brand_settings.{logo_url|signature_url}` with a
 *     7-day presigned URL so the form can preview it immediately.
 *
 * Returns: { s3_key, url, type }
 */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const formData = await req.formData();
    const file = (formData.get("file") ?? formData.get("logo")) as File | null;
    const rawType = formData.get("type");
    const type: AssetType = isAssetType(rawType) ? rawType : "logo";

    if (!file) return badRequest("file is required");
    if (!file.type.startsWith("image/")) return badRequest("File must be an image");
    if (file.size > 2 * 1024 * 1024) return badRequest("File must be under 2MB");

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const key = `site-walk/branding/${orgId}/${type}.${ext}`;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadBuffer(key, buffer, file.type);

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 60 * 60 * 24 * 7 } // 7 days
      );

      const admin = createAdminClient();

      // Read current brand_settings so we can merge instead of overwrite.
      const { data: orgRow } = await admin
        .from("organizations")
        .select("brand_settings")
        .eq("id", orgId)
        .single();

      const current = (orgRow?.brand_settings ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = {
        ...current,
        [`${type}_url`]: url,
        [`${type}_s3_key`]: key,
      };

      const update: Record<string, unknown> = { brand_settings: next };
      if (type === "logo") update.deliverable_logo_s3_key = key;

      await admin.from("organizations").update(update).eq("id", orgId);

      return ok({ s3_key: key, url, type });
    } catch (err) {
      console.error("[branding-upload]", err);
      return serverError("Failed to upload branding asset");
    }
  });
