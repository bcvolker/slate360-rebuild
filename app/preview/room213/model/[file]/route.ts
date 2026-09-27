import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";
import { BUCKET, s3 } from "@/lib/s3";
import { GOLDEN_FILE, GOLDEN_KEYS } from "@/lib/room213/provenance.server";

/**
 * Fallback delivery for the Room 213 golden PLY when no public media host is configured (ROOM213_MEDIA_BASE):
 * streams the one pinned object under a content-hashed name, with immutable caching and byte-range support.
 * Only that exact file name is served — nothing from the request reaches a storage key. Not served on production.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEADERS = {
  "Content-Type": "application/octet-stream",
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, immutable",
  "Accept-Ranges": "bytes",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "not found" }, { status: 404 });
  const { file } = await params;
  if (file !== GOLDEN_FILE) return NextResponse.json({ error: "not found" }, { status: 404 });

  const range = request.headers.get("range");
  const valid = range && /^bytes=\d*-\d*$/.test(range) ? range : undefined;
  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: GOLDEN_KEYS.ply, Range: valid }));
  const stream = (object.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined)?.transformToWebStream?.();
  if (!stream) return NextResponse.json({ error: "empty object" }, { status: 502 });
  const headers = new Headers(HEADERS);
  if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
  if (object.ETag) headers.set("ETag", object.ETag);
  if (valid && object.ContentRange) headers.set("Content-Range", object.ContentRange);
  return new Response(stream, { status: valid && object.ContentRange ? 206 : 200, headers });
}
