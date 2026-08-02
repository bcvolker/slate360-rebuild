import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveTwinShareModel } from "@/lib/digital-twin/share-model";
import { streamCapturePhotoForModel } from "@/lib/digital-twin/stream-capture-photo";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const checkRate = createTwinShareRateLimiter("twin-share:photo", 60, 60);

type Params = { params: Promise<{ token: string; assetId: string }> };

/**
 * Full-resolution source photo for a SHARED twin's Photo Explorer. Resolves
 * the model from the share token (revocation/expiry/max-views enforced by
 * resolveTwinShareModel), then streams the asset scoped to the model's
 * capture + org — so a share viewer can only reach photos that actually
 * belong to the shared model, never another capture's files.
 */
export async function GET(req: NextRequest, ctx: Params) {
  const { token, assetId } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  const result = await resolveTwinShareModel(token);
  if (!result.ok) return NextResponse.json({ error: "Unavailable" }, { status: 404 });

  const admin = createAdminClient();
  return streamCapturePhotoForModel(admin, {
    orgId: result.model.org_id,
    modelId: result.model.id,
    assetId,
  });
}
