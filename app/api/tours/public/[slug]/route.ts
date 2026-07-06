import { NextRequest } from "next/server";
import { ok, notFound, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicTourSummary } from "@/lib/tours/public-manifest";

export const runtime = "nodejs";

// GET /api/tours/public/[slug] — public, no auth. Returns a published tour's
// metadata + a thumbnail-only scene list (signed URLs, never raw R2 keys).
export const GET = async (_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  try {
    const admin = createAdminClient();
    const summary = await resolvePublicTourSummary(admin, slug);
    if (!summary) return notFound("Tour not found");
    return ok(summary);
  } catch (err) {
    console.error("[GET /api/tours/public/:slug] Error:", err);
    return serverError("Failed to load tour");
  }
};
