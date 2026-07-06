import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import {
  resolveTwinJobCreditEstimate,
  resolveTwinSourcesJobEstimate,
} from "@/lib/twin/job-credits-estimate";
import type { TwinCreditAsset } from "@/lib/twin/processing-credits";
import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";

export const runtime = "nodejs";

const OUTPUT_FORMATS = new Set(["spz", "ply", "glb"]);
const QUALITY_TIERS = new Set(["standard", "high"]);

function parseSources(body: unknown): TwinCreditAsset[] {
  if (!Array.isArray(body)) return [];
  return body
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const asset_kind =
        typeof (row as TwinCreditAsset).asset_kind === "string"
          ? (row as TwinCreditAsset).asset_kind
          : "photo";
      const file_size_bytes = Number((row as TwinCreditAsset).file_size_bytes ?? 0);
      if (!Number.isFinite(file_size_bytes) || file_size_bytes < 0) return null;
      return { asset_kind, file_size_bytes };
    })
    .filter((row): row is TwinCreditAsset => row !== null);
}

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const captureId = req.nextUrl.searchParams.get("capture_id")?.trim();
    if (!captureId) return badRequest("capture_id is required");

    const outputFormat = (req.nextUrl.searchParams.get("output_format") ?? "spz") as
      | "spz"
      | "ply"
      | "glb";
    if (!OUTPUT_FORMATS.has(outputFormat)) return badRequest("Invalid output_format");
    // C5: enum stays for the future; only spz is honored today.
    if (outputFormat !== "spz") {
      return badRequest("Only spz output is currently supported for digital twins");
    }

    try {
      const estimate = await resolveTwinJobCreditEstimate(admin, orgId, captureId, outputFormat);
      return ok({ estimate });
    } catch (err) {
      console.error("[GET /api/digital-twin/jobs/estimate]", err);
      return serverError(err instanceof Error ? err.message : "Failed to estimate credits");
    }
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => null)) as {
      sources?: unknown;
      output_format?: string;
      quality?: string;
      frameCount?: number;
    } | null;
    if (!body || !Array.isArray(body.sources) || body.sources.length === 0) {
      return badRequest("sources array is required");
    }

    const outputFormat = (body.output_format ?? "spz") as "spz" | "ply" | "glb";
    if (!OUTPUT_FORMATS.has(outputFormat)) return badRequest("Invalid output_format");
    // C5: enum stays for the future; only spz is honored today.
    if (outputFormat !== "spz") {
      return badRequest("Only spz output is currently supported for digital twins");
    }

    const quality = (body.quality ?? "standard") as TwinProcessingQuality;
    if (!QUALITY_TIERS.has(quality)) return badRequest("Invalid quality");

    const sources = parseSources(body.sources);
    if (!sources.length) return badRequest("No valid sources in request");

    try {
      const estimate = await resolveTwinSourcesJobEstimate(admin, orgId, {
        sources,
        outputFormat,
        quality,
        frameCount: body.frameCount,
      });
      return ok({ estimate });
    } catch (err) {
      console.error("[POST /api/digital-twin/jobs/estimate]", err);
      return serverError(err instanceof Error ? err.message : "Failed to estimate credits");
    }
  });
