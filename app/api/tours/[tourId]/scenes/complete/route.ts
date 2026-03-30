import { NextRequest, NextResponse } from "next/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createScene } from "@/lib/tours/queries";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { tourId: string } }) {
  try {
    const ctx = await resolveServerOrgContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, s3Key, size } = body as {
      title: string;
      s3Key: string;
      size: number;
    };

    if (!title || !s3Key || typeof size !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert the scene into the database
    const newScene = await createScene(ctx.supabase, {
      tourId: params.tourId,
      title,
      panoramaPath: s3Key,
      fileSizeBytes: size,
    });

    // Increment storage quota using our RPC
    const admin = createAdminClient();
    const { error: rpcError } = await admin.rpc("increment_org_storage", {
      target_org_id: ctx.org.id,
      bytes_delta: size,
    });

    if (rpcError) {
      console.error("[POST /api/tours/:id/scenes/complete] Failed to increment quota:", rpcError);
      // We don't fail the request if quota tracking fails, but we log it.
    }

    return NextResponse.json(newScene, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/tours/:id/scenes/complete] Error:", err);
    return NextResponse.json({ error: "Failed to complete scene upload" }, { status: 500 });
  }
}
