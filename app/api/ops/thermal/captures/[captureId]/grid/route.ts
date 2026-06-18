import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { decodeHikmicro, isHikmicroRadiometric } from "@/lib/thermal/hikmicro-extract";
import { decodeRadiometricNpz } from "@/lib/thermal/npz";

export const runtime = "nodejs";

type Params = { params: Promise<{ captureId: string }> };

async function readObject(key: string): Promise<Uint8Array> {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!obj.Body) throw new Error("Empty object body");
  return obj.Body.transformToByteArray();
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Serves a per-pixel temperature grid for the interactive probe viewer.
 *
 * Primary path: read the extracted radiometric NPZ (produced by the Modal worker
 * for ALL sensor profiles) so probing works for FLIR/DJI/Autel/HIKMICRO alike.
 * Fallback: if the capture hasn't been extracted yet but is a HIKMICRO file,
 * decode the original on demand (pre-extract fast path). Anything else → 415.
 */
export const GET = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { captureId } = await params;
    if (!captureId) return badRequest("captureId is required");

    const { data: capture, error } = await admin
      .from("thermal_captures")
      .select("id, org_id, storage_path, npz_data_path, filename")
      .eq("id", captureId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!capture || (orgId && capture.org_id && capture.org_id !== orgId)) {
      return notFound("Capture not found");
    }

    // Primary path — extracted radiometric grid (all sensors).
    if (capture.npz_data_path) {
      try {
        const npzBytes = await readObject(capture.npz_data_path as string);
        const grid = decodeRadiometricNpz(npzBytes);
        return ok({
          captureId: capture.id,
          filename: capture.filename,
          width: grid.width,
          height: grid.height,
          minC: round2(grid.minC),
          maxC: round2(grid.maxC),
          emissivity: null,
          source: "npz",
          // Round to 1 decimal to keep the payload compact.
          temps: Array.from(grid.temps, (v) => Math.round(v * 10) / 10),
        });
      } catch (e) {
        return serverError(
          `Failed to read radiometric grid: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Fallback — not yet extracted; decode HIKMICRO original on demand.
    if (!capture.storage_path) return badRequest("Capture has no stored file");

    let bytes: Uint8Array;
    try {
      bytes = await readObject(capture.storage_path as string);
    } catch (e) {
      return serverError(
        `Failed to read capture file: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    if (!isHikmicroRadiometric(bytes)) {
      return NextResponse.json(
        {
          error:
            "Per-pixel grid not available yet — run extract to generate the radiometric grid for this capture format.",
        },
        { status: 415 },
      );
    }

    try {
      const grid = decodeHikmicro(bytes, "F");
      return ok({
        captureId: capture.id,
        filename: capture.filename,
        width: grid.width,
        height: grid.height,
        minC: round2(grid.minC),
        maxC: round2(grid.maxC),
        emissivity: grid.emissivity,
        source: "hikmicro",
        temps: Array.from(grid.temps, (v) => Math.round(v * 10) / 10),
      });
    } catch (e) {
      return serverError(`Decode failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
