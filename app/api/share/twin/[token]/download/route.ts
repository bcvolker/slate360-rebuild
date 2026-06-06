import type { NextRequest } from "next/server";
import { resolveTwinShareDownload } from "@/lib/digital-twin/share-download";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { forbidden, notFound, ok, serverError } from "@/lib/server/api-response";

const checkRate = createTwinShareRateLimiter("twin-share:download", 8, 60);

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  try {
    const result = await resolveTwinShareDownload(token);
    if (!result.ok) {
      if (result.reason === "forbidden") return forbidden("Download permission required");
      if (result.reason === "unavailable") return notFound("Model not available");
      return notFound("Invalid or expired link");
    }

    return ok({
      download_url: result.downloadUrl,
      filename: result.filename,
      model_format: result.modelFormat,
    });
  } catch (err) {
    console.error("[GET /api/share/twin/[token]/download]", err);
    return serverError(err instanceof Error ? err.message : "Download failed");
  }
}
