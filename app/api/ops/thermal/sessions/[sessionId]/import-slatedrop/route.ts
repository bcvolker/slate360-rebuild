import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

function mimeFromType(type: string | null): string {
  switch ((type ?? "").toLowerCase()) {
    case "png":
      return "image/png";
    case "tif":
    case "tiff":
      return "image/tiff";
    default:
      return "image/jpeg";
  }
}

/**
 * Imports existing SlateDrop files into a thermal session by creating
 * thermal_captures rows that POINT AT the existing R2 keys (no re-upload).
 * Extract is then run by the caller to produce the radiometric grid.
 */
export const POST = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { sessionId } = await params;
    if (!sessionId) return badRequest("sessionId is required");

    let body: { uploadIds?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    const uploadIds = Array.isArray(body.uploadIds) ? body.uploadIds.filter(Boolean) : [];
    if (!uploadIds.length) return badRequest("uploadIds must be a non-empty array");

    const { data: session, error: sessionError } = await admin
      .from("thermal_analysis_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (sessionError) return serverError(sessionError.message);
    if (!session) return notFound("Session not found");

    const { data: uploads, error: uploadError } = await admin
      .from("slatedrop_uploads")
      .select("id, file_name, file_size, file_type, s3_key")
      .in("id", uploadIds)
      .eq("org_id", orgId)
      .eq("status", "active");
    if (uploadError) return serverError(uploadError.message);
    if (!uploads?.length) return badRequest("No matching SlateDrop files found");

    const rows = uploads.map((u) => ({
      session_id: sessionId,
      org_id: orgId,
      storage_path: u.s3_key,
      filename: u.file_name,
      content_type: mimeFromType(u.file_type),
      file_size_bytes: u.file_size ?? 0,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("thermal_captures")
      .insert(rows)
      .select("id");
    if (insertError) return serverError(insertError.message);

    await admin
      .from("thermal_analysis_sessions")
      .update({ status: "uploading" })
      .eq("id", sessionId);

    return ok({ imported: inserted?.length ?? 0, captureIds: (inserted ?? []).map((r) => r.id) });
  });
