import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FILES: Record<string, { path: string; type: string }> = {
  "brush_x4_arkit.spz": {
    path: "C:/s360-twin-brush/tmp/kitchen-proof/brush_x4_arkit.spz",
    type: "application/octet-stream",
  },
  "brush_x4_arkit.ply": {
    path: "C:/s360-twin-brush/tmp/kitchen-proof/brush_x4_arkit.ply",
    type: "application/octet-stream",
  },
  "brush_b.ply": {
    path: "C:/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/Runs/2026-08-31T22-x4-brush-challenger/brush_b_train/brush_b.ply",
    type: "application/octet-stream",
  },
};

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") ?? "";
  const spec = FILES[kind];
  if (!spec || !existsSync(spec.path)) {
    return NextResponse.json({ error: "not found", kind }, { status: 404 });
  }
  const size = statSync(spec.path).size;
  const stream = Readable.toWeb(createReadStream(spec.path)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": spec.type,
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
