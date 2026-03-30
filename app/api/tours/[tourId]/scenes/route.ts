import { NextRequest, NextResponse } from "next/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getTourScenes } from "@/lib/tours/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { tourId: string } }) {
  try {
    const ctx = await resolveServerOrgContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scenes = await getTourScenes(ctx.supabase, params.tourId);
    return NextResponse.json(scenes);
  } catch (err: any) {
    console.error("[GET /api/tours/:id/scenes] Error:", err);
    return NextResponse.json({ error: "Failed to fetch scenes" }, { status: 500 });
  }
}
