import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";
import { allowedMediaKind, type MediaKind } from "@/lib/spatial-walkthrough/policy";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const clipId = req.nextUrl.searchParams.get("clip");
  const kind = (req.nextUrl.searchParams.get("kind") ?? "proxy") as MediaKind;
  if (!clipId) return NextResponse.json({ error: "clip required" }, { status: 400 });

  const { admin, row } = await loadShareRow(token);
  const deny = shareDenied(row);
  if (deny || !row) return NextResponse.json({ error: deny ?? "invalid" }, { status: 404 });
  const pass = req.headers.get("x-walkthrough-pass") || req.nextUrl.searchParams.get("code");
  if (!passwordOk(row, pass)) return NextResponse.json({ error: "password" }, { status: 401 });
  if (!allowedMediaKind(row.policy, kind, false)) {
    return NextResponse.json({ error: "media not permitted" }, { status: 403 });
  }

  const { data: clip } = await admin
    .from("spatial_clips")
    .select("walkthrough_id, proxy_key, poster_key, master_key")
    .eq("id", clipId)
    .maybeSingle();
  if (!clip || clip.walkthrough_id !== row.walkthrough_id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const key = kind === "poster" ? clip.poster_key : clip.proxy_key;
  if (!key) return NextResponse.json({ error: "not ready" }, { status: 404 });

  const range = req.headers.get("range") ?? undefined;
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }));
  const contentType = kind === "poster" ? "image/jpeg" : "video/mp4";
  const headers = new Headers();
  headers.set("Content-Type", obj.ContentType || contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=60");
  if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
  if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
  const status = range && obj.ContentRange ? 206 : 200;
  const body = obj.Body as ReadableStream | null;
  return new NextResponse(body as never, { status, headers });
};
