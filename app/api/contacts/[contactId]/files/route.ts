import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, created, badRequest, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { deleteS3Object } from "@/lib/s3-utils";

type Ctx = { params: Promise<{ contactId: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { contactId } = await ctx.params;

    const { data, error } = await admin
      .from("contact_files")
      .select("*")
      .eq("contact_id", contactId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ files: data ?? [] });
  });

export const POST = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { contactId } = await ctx.params;

    // Verify contact belongs to this org
    const { data: contact } = await admin
      .from("org_contacts")
      .select("id")
      .eq("id", contactId)
      .eq("org_id", orgId)
      .single();
    if (!contact) return badRequest("Contact not found");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return badRequest("No file provided");

    const maxBytes = 100 * 1024 * 1024; // 100 MB per contact file
    if (file.size > maxBytes) return badRequest("File exceeds 100 MB limit");

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = `contacts/${orgId}/${contactId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      }));
    } catch (e) {
      return serverError(`S3 upload failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }

    const { data, error } = await admin
      .from("contact_files")
      .insert({
        contact_id: contactId,
        org_id: orgId,
        file_name: file.name,
        s3_key: s3Key,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return created({ file: data });
  });

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { contactId } = await ctx.params;

    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return badRequest("fileId required");

    // Fetch the file row first to get the S3 key before deleting
    const { data: file } = await admin
      .from("contact_files")
      .select("id, s3_key, size_bytes")
      .eq("id", fileId)
      .eq("contact_id", contactId)
      .eq("org_id", orgId)
      .single();

    if (!file) return badRequest("File not found");

    // Delete from S3 first — if this fails, abort to keep DB row for retry
    if (file.s3_key) {
      try {
        await deleteS3Object(file.s3_key);
      } catch (err) {
        console.error("[contact-file-delete] S3 deletion failed, aborting:", err);
        return serverError("Failed to delete file from storage. Please retry.");
      }
    }

    // S3 succeeded — safe to delete the DB row
    const { error } = await admin
      .from("contact_files")
      .delete()
      .eq("id", fileId)
      .eq("contact_id", contactId)
      .eq("org_id", orgId);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
