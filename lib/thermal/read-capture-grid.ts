import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { decodeHikmicro, isHikmicroRadiometric } from "@/lib/thermal/hikmicro-extract";
import { decodeRadiometricNpz } from "@/lib/thermal/npz";

export type CaptureGridResult =
  | {
      ok: true;
      grid: {
        captureId: string;
        filename: string | null;
        width: number;
        height: number;
        minC: number;
        maxC: number;
        emissivity: number | null;
        source: "npz" | "hikmicro";
        temps: number[];
      };
    }
  | { ok: false; status: number; error: string };

async function readObject(key: string): Promise<Uint8Array> {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!obj.Body) throw new Error("Empty object body");
  return obj.Body.transformToByteArray();
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Shared per-pixel grid reader — used by both the authenticated Analyze/AI
 * Review grid route and the token-gated Radiometric Live Link (S7.5/A4).
 * Pulled out of app/api/ops/thermal/captures/[captureId]/grid/route.ts so
 * neither copy of this logic drifts from the other.
 */
export async function readCaptureGrid(
  admin: SupabaseClient,
  captureId: string,
  orgId: string | null,
): Promise<CaptureGridResult> {
  const { data: capture, error } = await admin
    .from("thermal_captures")
    .select("id, org_id, storage_path, npz_data_path, filename")
    .eq("id", captureId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };
  if (!capture || (orgId && capture.org_id && capture.org_id !== orgId)) {
    return { ok: false, status: 404, error: "Capture not found" };
  }

  if (capture.npz_data_path) {
    try {
      const npzBytes = await readObject(capture.npz_data_path as string);
      const grid = decodeRadiometricNpz(npzBytes);
      return {
        ok: true,
        grid: {
          captureId: capture.id,
          filename: capture.filename,
          width: grid.width,
          height: grid.height,
          minC: round2(grid.minC),
          maxC: round2(grid.maxC),
          emissivity: null,
          source: "npz",
          temps: Array.from(grid.temps, (v) => Math.round(v * 10) / 10),
        },
      };
    } catch (e) {
      return { ok: false, status: 500, error: `Failed to read radiometric grid: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  if (!capture.storage_path) return { ok: false, status: 400, error: "Capture has no stored file" };

  let bytes: Uint8Array;
  try {
    bytes = await readObject(capture.storage_path as string);
  } catch (e) {
    return { ok: false, status: 500, error: `Failed to read capture file: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!isHikmicroRadiometric(bytes)) {
    return {
      ok: false,
      status: 415,
      error: "Per-pixel grid not available yet — run extract to generate the radiometric grid for this capture format.",
    };
  }

  try {
    const grid = decodeHikmicro(bytes, "F");
    return {
      ok: true,
      grid: {
        captureId: capture.id,
        filename: capture.filename,
        width: grid.width,
        height: grid.height,
        minC: round2(grid.minC),
        maxC: round2(grid.maxC),
        emissivity: grid.emissivity,
        source: "hikmicro",
        temps: Array.from(grid.temps, (v) => Math.round(v * 10) / 10),
      },
    };
  } catch (e) {
    return { ok: false, status: 500, error: `Decode failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
