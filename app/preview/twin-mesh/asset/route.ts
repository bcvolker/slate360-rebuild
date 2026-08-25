import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

import { s3, BUCKET } from "@/lib/s3";

/**
 * Same-origin proxy for the M6b preview harness.
 *
 * R2 presigned URLs carry no `Access-Control-Allow-Origin`, so a browser
 * refuses to fetch the GLB cross-origin and three.js fails the load. Streaming
 * through the app makes it same-origin.
 *
 * SECURITY: this route is unauthenticated, like the rest of `/preview/*`, but
 * unlike the others it touches real stored geometry. So it is pinned to a
 * single hard-coded org and space — the kitchen validation capture — and to a
 * fixed set of artefact suffixes. Org and space are deliberately NOT readable
 * from the query string: an unauthenticated proxy that accepts an arbitrary
 * org id would serve any tenant's models to anyone who guessed a UUID.
 *
 * This harness must not ship to production as-is; the authenticated twin
 * viewer resolves its own signed URLs server-side and needs none of this.
 */

const PINNED_ORG = "c5538bfd-a67a-4930-8481-0e5e331ec7cc";
const PINNED_SPACE = "f10a56ab-cd2b-42e0-b328-363e8940172e";

const ALLOWED_SUFFIXES: Record<string, string> = {
  "dollhouse.glb": "model/gltf-binary",
  "raw.glb": "model/gltf-binary",
  // PLY carries vertex colours; Open3D's glTF writer silently drops them.
  "dollhouse.ply": "application/octet-stream",
  "raw.ply": "application/octet-stream",
  "walk.json": "application/json",
  "floorplan.json": "application/json",
};

// Labels are operator-generated run names; keep them to a safe charset so a
// suffix can never be smuggled through a traversal sequence.
const LABEL_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const label = params.get("label") ?? "";
  const suffix = params.get("kind") ?? "";

  if (!LABEL_RE.test(label)) {
    return NextResponse.json({ error: "invalid label" }, { status: 400 });
  }
  const contentType = ALLOWED_SUFFIXES[suffix];
  if (!contentType) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  const key = `orgs/${PINNED_ORG}/digital-twin/${PINNED_SPACE}/models/${label}.${suffix}`;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) return NextResponse.json({ error: "empty object" }, { status: 404 });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found", key }, { status: 404 });
  }
}
