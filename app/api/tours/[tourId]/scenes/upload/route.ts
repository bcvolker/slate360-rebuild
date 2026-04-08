import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

// POST /api/tours/[tourId]/scenes/upload
export const POST = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { filename, contentType, size, width, height } = body as {
        filename: string;
        contentType: string;
        size: number;
        width?: number;
        height?: number;
      };

      if (!filename || !contentType || !size) {
        return badRequest("Missing required fields");
      }

      // Raw camera file rejection — must happen before MIME check
      const lowerName = filename.toLowerCase();
      if (lowerName.endsWith(".insv") || lowerName.endsWith(".360") || lowerName.endsWith(".dng")) {
        return badRequest(
          "Raw camera files are not supported. Please export your panorama to a finished JPEG (equirectangular format) using your camera's desktop or mobile app first."
        );
      }

      // JPEG / PNG only
      const allowedMimeTypes = ["image/jpeg", "image/png"] as const;
      if (!(allowedMimeTypes as readonly string[]).includes(contentType)) {
        return badRequest("Only JPEG and PNG files are accepted. Please export your panorama as a JPEG or PNG before uploading.");
      }

      // Approximate 2:1 aspect ratio check (equirectangular panoramas are 2:1 — e.g. 5760×2880)
      // Allow ±15% tolerance around the ideal 2.0 ratio → valid range [1.70, 2.30]
      if (width !== undefined && height !== undefined && height > 0) {
        const ratio = width / height;
        if (ratio < 1.7 || ratio > 2.3) {
          return badRequest(
            "This image does not appear to be an equirectangular 360° panorama. " +
            "Please upload an image with an approximate 2:1 aspect ratio (e.g. 5760×2880). " +
            `Received: ${width}×${height} (ratio ${ratio.toFixed(2)}:1).`
          );
        }
      }

      // Enforce storage limits
      const { data: orgData } = await admin
        .from("organizations")
        .select("tier, org_storage_used_bytes")
        .eq("id", orgId)
        .single();

      if (orgData) {
        const { data: flags } = await admin
          .from("org_feature_flags")
          .select("*")
          .eq("org_id", orgId)
          .maybeSingle();

        const { getEntitlements } = await import("@/lib/entitlements");
        const entitlements = getEntitlements(orgData.tier, { featureFlags: flags || {} });

        const maxGB = entitlements?.maxStorageGB || 5;
        const limitBytes = maxGB * 1024 * 1024 * 1024;
        const currentUsageBytes = Number(orgData.org_storage_used_bytes) || 0;
        const newTotalBytes = currentUsageBytes + size;

        if (newTotalBytes > limitBytes) {
          return NextResponse.json({
            error: "Storage limit exceeded. Please upgrade your plan.",
            currentUsageBytes,
            limitBytes,
            attemptedSizeBytes: size,
          }, { status: 429 });
        }
      }

      // Path convention: tours/{orgId}/{tourId}/scenes/{filename}
      // We add a timestamp to prevent overwriting scenes with the same filename (e.g. IMG_001.jpg)
      const timestamp = Date.now();
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const s3Key = `tours/${orgId}/${tourId}/scenes/${timestamp}_${cleanFilename}`;

      // Generate S3 Presigned URL
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        ContentType: contentType,
        ContentLength: size,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

      return ok({ uploadUrl, s3Key, size });
    } catch (err: any) {
      console.error("[POST /api/tours/:id/scenes/upload] Error:", err);
      return serverError("Failed to initialize upload");
    }
  });
};
