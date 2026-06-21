import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Resolve the orientation/framing manifest for a twin model.
 *
 * The viewer holds the model URL (presigned R2 or public passthrough) but not the
 * storage key, so we derive the sibling "<key>.manifest.json" from the URL path and
 * read it server-side. Non-sensitive (bounds/orientation only). Missing → 404.
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return NextResponse.json(null, { status: 400 });

  let key: string | null = null;
  try {
    const parsed = new URL(u);
    let path = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
    if (BUCKET && path.startsWith(`${BUCKET}/`)) path = path.slice(BUCKET.length + 1);
    if (path.toLowerCase().endsWith(".spz")) {
      key = `${path.slice(0, -".spz".length)}.manifest.json`;
    }
  } catch {
    key = null;
  }
  if (!key) return NextResponse.json(null, { status: 404 });

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body?.transformToString();
    if (!body) return NextResponse.json(null, { status: 404 });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(null, { status: 404 });
  }
}
