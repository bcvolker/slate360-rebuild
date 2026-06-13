import { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { decodeHikmicro, isHikmicroRadiometric } from "@/lib/thermal/hikmicro-extract";

export const runtime = "nodejs";

type Params = { params: Promise<{ captureId: string }> };

/**
 * Serves a per-pixel temperature grid for the interactive probe viewer.
 *
 * Decodes the stored original file on demand with the validated HIKMICRO decoder.
 * Other radiometric formats fall through to a 415 (the static preview is used instead).
 */
export const GET = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { captureId } = await params;
    if (!captureId) return badRequest("captureId is required");

    const { data: capture, error } = await admin
      .from("thermal_captures")
      .select("id, org_id, storage_path, filename")
      .eq("id", captureId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!capture || (orgId && capture.org_id && capture.org_id !== orgId)) {
      return notFound("Capture not found");
    }
    if (!capture.storage_path) return badRequest("Capture has no stored file");

    let bytes: Uint8Array;
    try {
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: capture.storage_path as string }),
      );
      if (!obj.Body) return serverError("Empty object body");
      bytes = await obj.Body.transformToByteArray();
    } catch (e) {
      return serverError(`Failed to read capture file: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!isHikmicroRadiometric(bytes)) {
      return new Response(
        JSON.stringify({ error: "Per-pixel grid not available for this capture format." }),
        { status: 415, headers: { "Content-Type": "application/json" } },
      );
    }

    try {
      const grid = decodeHikmicro(bytes, "F");
      return ok({
        captureId: capture.id,
        filename: capture.filename,
        width: grid.width,
        height: grid.height,
        minC: Math.round(grid.minC * 100) / 100,
        maxC: Math.round(grid.maxC * 100) / 100,
        emissivity: grid.emissivity,
        // Round to 1 decimal to keep the payload compact.
        temps: Array.from(grid.temps, (v) => Math.round(v * 10) / 10),
      });
    } catch (e) {
      return serverError(`Decode failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
