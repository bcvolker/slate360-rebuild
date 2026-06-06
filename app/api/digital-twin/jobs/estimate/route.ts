import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { resolveTwinJobCreditEstimate } from "@/lib/twin/job-credits-estimate";

export const runtime = "nodejs";

const OUTPUT_FORMATS = new Set(["spz", "ply", "glb"]);

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

    try {
      const estimate = await resolveTwinJobCreditEstimate(admin, orgId, captureId, outputFormat);
      return ok({ estimate });
    } catch (err) {
      console.error("[GET /api/digital-twin/jobs/estimate]", err);
      return serverError(err instanceof Error ? err.message : "Failed to estimate credits");
    }
  });
