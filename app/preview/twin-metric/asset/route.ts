import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

import { s3, BUCKET } from "@/lib/s3";
import { signedGetUrl } from "@/lib/storage/signed-get";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PINNED_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const PINNED_SPACE = "e4eaf78b-b064-4cce-b640-8bc8efb820e1";
const JOB_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KINDS: Record<string, { suffix: string; type: string; inline?: boolean }> = {
  "geometry.glb": { suffix: "geometry.glb", type: "model/gltf-binary" },
  "geometry-web.glb": { suffix: "geometry-web.glb", type: "model/gltf-binary" },
  "geometry-display.glb": { suffix: "geometry-display.glb", type: "model/gltf-binary" },
  "geometry-nav.glb": { suffix: "geometry-nav.glb", type: "model/gltf-binary" },
  "geometry-measurement.glb": { suffix: "geometry-measurement.glb", type: "model/gltf-binary" },
  "appearance-x4-v1.spz": { suffix: "appearance-x4-v1.spz", type: "application/octet-stream" },
  "appearance-web.spz": { suffix: "appearance-web.spz", type: "application/octet-stream" },
  "brush_x4_arkit.spz": { suffix: "brush_x4_arkit.spz", type: "application/octet-stream" },
  "floor_slice.png": { suffix: "floor_slice.png", type: "image/png", inline: true },
  "thumbnail.png": { suffix: "thumbnail.png", type: "image/png", inline: true },
  "qa.json": { suffix: "qa.json", type: "application/json", inline: true },
  "processing_manifest.json": { suffix: "processing_manifest.json", type: "application/json", inline: true },
};

export async function GET(request: NextRequest) {
  const job = request.nextUrl.searchParams.get("job") ?? "";
  const kind = request.nextUrl.searchParams.get("kind") ?? "geometry.glb";
  const proxy = request.nextUrl.searchParams.get("proxy") === "1";
  const spec = KINDS[kind];
  if (!JOB_RE.test(job) || !spec) {
    return NextResponse.json({ error: "invalid job or kind" }, { status: 400 });
  }
  const key = `orgs/${PINNED_ORG}/digital-twin/${PINNED_SPACE}/models/${job}/${spec.suffix}`;

  if (spec.inline || proxy) {
    try {
      const range = request.headers.get("range") ?? undefined;
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }));
      if (!res.Body) return NextResponse.json({ error: "empty" }, { status: 404 });
      const headers = new Headers();
      headers.set("Content-Type", spec.type);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", spec.inline ? "public, max-age=300" : "public, max-age=86400");
      if (res.ContentLength != null) headers.set("Content-Length", String(res.ContentLength));
      if (res.ContentRange) headers.set("Content-Range", res.ContentRange);
      return new NextResponse(res.Body.transformToWebStream(), {
        status: range && res.ContentRange ? 206 : 200,
        headers,
      });
    } catch {
      return NextResponse.json({ error: "not found", key }, { status: 404 });
    }
  }

  try {
    const url = await signedGetUrl(key);
    return NextResponse.redirect(url, 302);
  } catch {
    return NextResponse.json({ error: "not found", key }, { status: 404 });
  }
}
