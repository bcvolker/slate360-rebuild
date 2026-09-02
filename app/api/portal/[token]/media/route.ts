import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { selectDerivativeKey, type MediaKind } from "@/lib/spatial-walkthrough/derivatives";
import { loadProjectShareRow, shareDenied, projectSharePasswordOk } from "@/lib/spatial-walkthrough/project-share";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

/**
 * Token-scoped media proxy for the client portal. Mirrors
 * app/api/spatial-walkthrough/public/[token]/media/route.ts but the token is
 * a project share, so every clip is re-checked against the project before
 * streaming — a portal token for project A can never read a clip from
 * project B even if the clip id is guessed.
 */
export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const walkthroughId = req.nextUrl.searchParams.get("wt");
  const clipId = req.nextUrl.searchParams.get("clip");
  const kind = (req.nextUrl.searchParams.get("kind") ?? "poster") as MediaKind;
  if (!walkthroughId || !clipId) return NextResponse.json(publicShareDenial(), { status: 404 });
  if (kind === "master") return NextResponse.json(publicShareDenial(), { status: 404 });

  const { admin, row } = await loadProjectShareRow(token);
  if (shareDenied(row) || !row) return NextResponse.json(publicShareDenial(), { status: 404 });
  const unlocked = sessionUnlocksShare({ req, tokenHash: row.token_hash, passwordHash: row.password_hash });
  const pass = req.headers.get("x-portal-pass") || req.nextUrl.searchParams.get("code");
  if (!unlocked && !projectSharePasswordOk(row, pass)) {
    return NextResponse.json(publicShareDenial(), { status: 401 });
  }

  const { data: wt } = await admin
    .from("spatial_walkthroughs")
    .select("id, project_id")
    .eq("id", walkthroughId)
    .maybeSingle();
  if (!wt || wt.project_id !== row.project_id) return NextResponse.json(publicShareDenial(), { status: 404 });

  const { data: clip } = await admin
    .from("spatial_clips")
    .select("walkthrough_id, proxy_key, poster_key, public_proxy_key")
    .eq("id", clipId)
    .maybeSingle();
  if (!clip || clip.walkthrough_id !== walkthroughId) return NextResponse.json(publicShareDenial(), { status: 404 });

  const key = selectDerivativeKey(clip, kind, "client", false);
  if (!key) return NextResponse.json(publicShareDenial(), { status: 404 });

  const range = req.headers.get("range") ?? undefined;
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range }));
  const headers = new Headers();
  headers.set("Content-Type", obj.ContentType || (kind === "poster" ? "image/jpeg" : "video/mp4"));
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
  if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
  return new NextResponse(obj.Body as never, { status: range && obj.ContentRange ? 206 : 200, headers });
};
