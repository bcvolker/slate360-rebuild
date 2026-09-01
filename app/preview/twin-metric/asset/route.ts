import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

import { s3, BUCKET } from "@/lib/s3";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PINNED_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const PINNED_SPACE = "e4eaf78b-b064-4cce-b640-8bc8efb820e1";
const JOB_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KINDS: Record<string, { suffix: string; type: string }> = {
  "geometry.glb": { suffix: "geometry.glb", type: "model/gltf-binary" },
  "geometry-web.glb": { suffix: "geometry-web.glb", type: "model/gltf-binary" },
  "appearance-x4-v1.spz": { suffix: "appearance-x4-v1.spz", type: "application/octet-stream" },
  "floor_slice.png": { suffix: "floor_slice.png", type: "image/png" },
  "thumbnail.png": { suffix: "thumbnail.png", type: "image/png" },
  "qa.json": { suffix: "qa.json", type: "application/json" },
  "processing_manifest.json": { suffix: "processing_manifest.json", type: "application/json" },
};

export async function GET(request: NextRequest) {
  const job = request.nextUrl.searchParams.get("job") ?? "";
  const kind = request.nextUrl.searchParams.get("kind") ?? "geometry.glb";
  const spec = KINDS[kind];
  if (!JOB_RE.test(job) || !spec) {
    return NextResponse.json({ error: "invalid job or kind" }, { status: 400 });
  }
  const key = `orgs/${PINNED_ORG}/digital-twin/${PINNED_SPACE}/models/${job}/${spec.suffix}`;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!res.Body) return NextResponse.json({ error: "empty" }, { status: 404 });
    return new NextResponse(res.Body.transformToWebStream(), {
      headers: {
        "Content-Type": spec.type,
        ...(res.ContentLength != null ? { "Content-Length": String(res.ContentLength) } : {}),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found", key }, { status: 404 });
  }
}
