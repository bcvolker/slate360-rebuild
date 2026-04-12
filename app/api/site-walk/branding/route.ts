import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadBuffer } from "@/lib/s3-utils";

/** POST /api/site-walk/branding — upload org logo for deliverables */
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;

    if (!file) return badRequest("logo file is required");
    if (!file.type.startsWith("image/")) return badRequest("File must be an image");
    if (file.size > 2 * 1024 * 1024) return badRequest("Logo must be under 2MB");

    const ext = file.name.split(".").pop() ?? "png";
    const key = `site-walk/branding/${orgId}/logo.${ext}`;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadBuffer(key, buffer, file.type);

      const admin = createAdminClient();
      await admin
        .from("organizations")
        .update({ deliverable_logo_s3_key: key })
        .eq("id", orgId);

      return ok({ s3_key: key });
    } catch (err) {
      console.error("[branding-upload]", err);
      return serverError("Failed to upload logo");
    }
  });
