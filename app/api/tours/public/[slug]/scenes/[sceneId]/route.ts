import { NextRequest } from "next/server";
import { ok, notFound, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicSceneRuntime } from "@/lib/tours/public-manifest";

export const runtime = "nodejs";

// GET /api/tours/public/[slug]/scenes/[sceneId] — public, no auth. Resolved
// on-demand as the viewer navigates so a many-scene tour doesn't sign every
// scene's full tile set on first load (see resolvePublicTourSummary).
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> },
) => {
  const { slug, sceneId } = await params;
  try {
    const admin = createAdminClient();
    const runtime = await resolvePublicSceneRuntime(admin, slug, sceneId);
    if (!runtime) return notFound("Scene not found");
    return ok(runtime);
  } catch (err) {
    console.error("[GET /api/tours/public/:slug/scenes/:sceneId] Error:", err);
    return serverError("Failed to load scene");
  }
};
