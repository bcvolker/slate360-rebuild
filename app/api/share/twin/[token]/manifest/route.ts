import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { resolveTwinShareSplat } from "@/lib/digital-twin/share-splat";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { BUCKET, s3 } from "@/lib/s3";

export const runtime = "nodejs";

const checkRate = createTwinShareRateLimiter("twin-share:manifest", 30, 60);

type Params = { params: Promise<{ token: string }> };

/**
 * Orientation/framing manifest for a SHARED twin model.
 *
 * The in-app viewer fetches the manifest via `/api/digital-twin/splat-manifest?u=<presigned .spz>`,
 * which derives the sibling `<key>.manifest.json` by requiring a `.spz`-suffixed URL. Share links
 * stream the model through `/api/share/twin/<token>/splat` (no `.spz` suffix), so that derivation
 * 404s and the model renders with NO orientation correction — i.e. upside-down / mis-framed on the
 * branded share link specifically. This route resolves the storage key from the share token
 * directly and streams the baked manifest so shared twins are upright + framed like the in-app viewer.
 */
export async function GET(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  const result = await resolveTwinShareSplat(token);
  if (!result.ok) return NextResponse.json(null, { status: 404 });

  const storageKey = result.storageKey;
  const key = storageKey.toLowerCase().endsWith(".spz")
    ? `${storageKey.slice(0, -".spz".length)}.manifest.json`
    : null;
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
