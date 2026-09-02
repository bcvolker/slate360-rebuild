import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";
import { selectDerivativeKey, type MediaKind } from "@/lib/spatial-walkthrough/derivatives";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { s3, BUCKET } from "@/lib/s3";
import { signedGetUrl } from "@/lib/storage/signed-get";

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
    .select("walkthrough_id, proxy_key, poster_key, public_proxy_key")
    .eq("id", clipId)
    .maybeSingle();
  if (!clip || clip.walkthrough_id !== row.walkthrough_id) {
    return NextResponse.json(publicShareDenial(), { status: 404 });
  }
  const key = selectDerivativeKey(clip, kind, row.policy, false);
  if (!key) return NextResponse.json(publicShareDenial(), { status: 404 });

  // Posters can 302 to R2 (img tags do not need CORS). 360 video must stay
  // same-origin until the R2 API token can write a GET CORS policy.
  if (kind === "poster") {
    const url = await signedGetUrl(key);
    return NextResponse.redirect(url, 302);
  }

  const range = req.headers.get("range") ?? undefined;
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }));
  const headers = new Headers();
  headers.set("Content-Type", obj.ContentType || "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=60");
  if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
  if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
  return new NextResponse(obj.Body as never, {
    status: range && obj.ContentRange ? 206 : 200,
    headers,
  });
};
