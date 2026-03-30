import { NextRequest, NextResponse } from "next/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { deleteScene } from "@/lib/tours/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: { tourId: string; sceneId: string } }) {
  try {
    const ctx = await resolveServerOrgContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Step 1: Delete from Supabase
    const scene = await deleteScene(ctx.supabase, params.sceneId, params.tourId);
    
    // Step 2: Delete from S3
    const s3KeysToDelete: string[] = [];
    if (scene.panorama_path) s3KeysToDelete.push(scene.panorama_path);
    if (scene.thumbnail_path) s3KeysToDelete.push(scene.thumbnail_path);
    
    if (s3KeysToDelete.length > 0) {
      await deleteS3Objects(s3KeysToDelete);
    }

    // Step 3: Exact Quota Recovery!
    const recoveredBytes = Number(scene.file_size_bytes) || 0;
    if (recoveredBytes > 0) {
      await recoverOrgStorage(ctx.org.id, recoveredBytes);
    }

    return NextResponse.json({ success: true, sceneId: scene.id });
  } catch (err: any) {
    console.error("[DELETE /api/tours/:tourId/scenes/:sceneId] Error:", err);
    return NextResponse.json({ error: "Failed to delete scene" }, { status: 500 });
  }
}
