import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";
import { selectDerivativeKey, type MediaKind } from "@/lib/spatial-walkthrough/derivatives";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";

export const runtime = "nodejs";
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

  const range = req.headers.get("range") ?? undefined;
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }));
  const contentType = kind === "poster" ? "image/jpeg" : "video/mp4";
  const headers = new Headers();
  headers.set("Content-Type", obj.ContentType || contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
  if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
  const status = range && obj.ContentRange ? 206 : 200;
  return new NextResponse(obj.Body as never, { status, headers });
};
