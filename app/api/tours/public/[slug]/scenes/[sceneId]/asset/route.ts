import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, badRequest } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicSceneAsset } from "@/lib/tours/public-manifest";

export const runtime = "nodejs";

// GET /api/tours/public/[slug]/scenes/[sceneId]/asset?variant=base|tile|fallback&col=&row=
// Same-origin proxy for WebGL-consumed assets (see public-manifest.ts for why
// this exists instead of direct R2 signed URLs — R2 bucket CORS blocks the
// fetch()-based texture reads PSV's tiles adapter needs).
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> },
) => {
  const { slug, sceneId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const variant = searchParams.get("variant");
  if (variant !== "base" && variant !== "tile" && variant !== "fallback") {
    return badRequest("variant must be base, tile, or fallback");
  }
  const col = searchParams.has("col") ? Number(searchParams.get("col")) : undefined;
  const row = searchParams.has("row") ? Number(searchParams.get("row")) : undefined;

  try {
    const admin = createAdminClient();
    const asset = await resolvePublicSceneAsset(admin, slug, sceneId, variant, col, row);
    if (!asset) return notFound("Asset not found");

    return new NextResponse(Buffer.from(asset.body), {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (err) {
    console.error("[GET /api/tours/public/:slug/scenes/:sceneId/asset] Error:", err);
    return serverError("Failed to load asset");
  }
};
