import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";
import { selectDerivativeKey, type MediaKind } from "@/lib/spatial-walkthrough/derivatives";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { s3, BUCKET } from "@/lib/s3";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;
type Ctx = { params: Promise<{ token: string }> };

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const clipId = req.nextUrl.searchParams.get("clip");
  const kind = (req.nextUrl.searchParams.get("kind") ?? "proxy") as MediaKind;
  if (!clipId) return NextResponse.json(publicShareDenial(), { status: 404 });

  const { admin, row } = await loadShareRow(token);
  if (shareDenied(row) || !row) return NextResponse.json(publicShareDenial(), { status: 404 });
  const unlocked = sessionUnlocksShare({ req, tokenHash: row.token_hash ?? "", passwordHash: row.password_hash });
  const pass = req.headers.get("x-walkthrough-pass") || req.nextUrl.searchParams.get("code");
  if (!unlocked && !passwordOk(row, pass)) return NextResponse.json(publicShareDenial(), { status: 401 });
  if (kind === "master") return NextResponse.json(publicShareDenial(), { status: 404 });

  const { data: clip } = await admin
    .from("spatial_clips")
    .select("walkthrough_id, proxy_key, poster_key, public_proxy_key, client_poster_key, public_poster_key")
    .eq("id", clipId)
    .maybeSingle();
  if (!clip || clip.walkthrough_id !== row.walkthrough_id) {
    return NextResponse.json(publicShareDenial(), { status: 404 });
  }
  const key = selectDerivativeKey(clip, kind, row.policy, false);
  if (!key) return NextResponse.json(publicShareDenial(), { status: 404 });

  // Same-origin Range stream for poster AND video. Direct R2 302 has no CORS
  // (`PutBucketCors` is AccessDenied on the current token). Video.crossOrigin
  // + a 302 poster taints the PSV canvas and can crash the public player.
  const range = kind === "hero" ? undefined : (req.headers.get("range") ?? undefined);
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }),
    { abortSignal: req.signal },
  );
  if (!obj.Body) return NextResponse.json(publicShareDenial(), { status: 404 });
  const headers = new Headers();
  if (kind === "hero") {
    const bytes = Buffer.from(await obj.Body.transformToByteArray());
    const meta = await sharp(bytes).metadata();
    const w = meta.width ?? 2;
    const h = meta.height ?? 2;
    const left = Math.floor(w * 0.28);
    const top = Math.floor(h * 0.18);
    const width = Math.max(32, Math.floor(w * 0.44));
    const height = Math.max(32, Math.floor(h * 0.46));
    const hero = await sharp(bytes).extract({ left, top, width, height }).jpeg({ quality: 82 }).toBuffer();
    return new NextResponse(hero, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  headers.set("Content-Type", obj.ContentType || (kind === "poster" ? "image/jpeg" : "video/mp4"));
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
  if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
  return new NextResponse(obj.Body.transformToWebStream(), {
    status: range && obj.ContentRange ? 206 : 200,
    headers,
  });
};
