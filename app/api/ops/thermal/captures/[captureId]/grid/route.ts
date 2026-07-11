import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { readCaptureGrid } from "@/lib/thermal/read-capture-grid";

export const runtime = "nodejs";

type Params = { params: Promise<{ captureId: string }> };

/**
 * Serves a per-pixel temperature grid for the interactive probe viewer.
 *
 * Primary path: read the extracted radiometric NPZ (produced by the Modal worker
 * for ALL sensor profiles) so probing works for FLIR/DJI/Autel/HIKMICRO alike.
 * Fallback: if the capture hasn't been extracted yet but is a HIKMICRO file,
 * decode the original on demand (pre-extract fast path). Anything else → 415.
 *
 * Shared with the token-gated Radiometric Live Link (S7.5) via
 * lib/thermal/read-capture-grid.ts — same decode path, different auth.
 */
export const GET = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { captureId } = await params;
    if (!captureId) return badRequest("captureId is required");

    const result = await readCaptureGrid(admin, captureId, orgId);
    if (!result.ok) {
      if (result.status === 400) return badRequest(result.error);
      if (result.status === 404) return notFound(result.error);
      if (result.status === 415) return ok({ error: result.error }, 415);
      return serverError(result.error);
    }
    return ok(result.grid);
  });
