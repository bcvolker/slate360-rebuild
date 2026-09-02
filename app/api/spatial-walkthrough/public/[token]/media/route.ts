import { NextRequest, NextResponse } from "next/server";

import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";
import { selectDerivativeKey, type MediaKind } from "@/lib/spatial-walkthrough/derivatives";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { signedGetUrl } from "@/lib/storage/signed-get";

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

  const contentType = kind === "poster" ? "image/jpeg" : "video/mp4";
  const url = await signedGetUrl(key, { contentType, cacheControl: "private, max-age=300" });
  return NextResponse.redirect(url, 302);
};
