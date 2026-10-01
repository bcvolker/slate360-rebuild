import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const { admin, row } = await loadShareRow(token);
  const deny = shareDenied(row);
  if (deny || !row) return NextResponse.json({ error: deny ?? "invalid" }, { status: 404 });
  const pass = req.headers.get("x-walkthrough-pass") || req.nextUrl.searchParams.get("code");
  if (!passwordOk(row, pass)) return NextResponse.json({ error: "password" }, { status: 401 });

  const { data: wt } = await admin.from("spatial_walkthroughs").select("org_id").eq("id", row.walkthrough_id).maybeSingle();
  if (!wt) return NextResponse.json({ error: "missing" }, { status: 404 });
  const { data: theme } = await admin
    .from("spatial_org_themes")
    .select("logo_display_key, logo_key")
    .eq("org_id", wt.org_id)
    .maybeSingle();
  const key = theme?.logo_display_key || theme?.logo_key;
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const type = obj.ContentType || (key.endsWith(".svg") ? "image/svg+xml" : "image/png");
  const headers = new Headers();
  headers.set("Content-Type", type);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, max-age=120");
  if (type.includes("svg")) headers.set("Content-Security-Policy", "sandbox");
  return new NextResponse(obj.Body as never, { status: 200, headers });
};
