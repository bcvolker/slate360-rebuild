import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { streamCapturePhotoForModel } from "@/lib/digital-twin/stream-capture-photo";

export const runtime = "nodejs";

type Params = { params: Promise<{ modelId: string; assetId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { modelId, assetId } = await ctx.params;
    return streamCapturePhotoForModel(admin, { orgId, modelId, assetId });
  });
}
