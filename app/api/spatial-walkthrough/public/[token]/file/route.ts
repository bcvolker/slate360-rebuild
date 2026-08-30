import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";
import { attachmentVisibleOnPolicy, pinVisibleOnPolicy } from "@/lib/spatial-walkthrough/pins";
import type { PinVisibility, SharePolicy } from "@/lib/spatial-walkthrough/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const attachmentId = req.nextUrl.searchParams.get("attachmentId");
  if (!attachmentId) return NextResponse.json({ error: "attachmentId required" }, { status: 400 });

  const { admin, row } = await loadShareRow(token);
  const deny = shareDenied(row);
  if (deny || !row) return NextResponse.json({ error: deny ?? "invalid" }, { status: 404 });
  const pass = req.headers.get("x-walkthrough-pass") || req.nextUrl.searchParams.get("code");
  if (!passwordOk(row, pass)) return NextResponse.json({ error: "password" }, { status: 401 });

  const { data: att } = await admin.from("spatial_pin_attachments").select("*").eq("id", attachmentId).maybeSingle();
  if (!att) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: pin } = await admin.from("spatial_pins").select("*").eq("id", att.pin_id).maybeSingle();
  if (!pin || pin.walkthrough_id !== row.walkthrough_id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const policy = row.policy as SharePolicy;
  if (!pinVisibleOnPolicy(pin.visibility as PinVisibility, policy)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!attachmentVisibleOnPolicy(Boolean(att.visible_on_public), policy)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (att.kind === "url" && att.external_url) {
    return NextResponse.redirect(att.external_url);
  }
  if (!att.slatedrop_id) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: file } = await admin
    .from("slatedrop_uploads")
    .select("s3_key, file_name, file_type")
    .eq("id", att.slatedrop_id)
    .maybeSingle();
  if (!file?.s3_key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: file.s3_key }));
  const headers = new Headers();
  headers.set("Content-Type", file.file_type || obj.ContentType || "application/octet-stream");
  headers.set("Content-Disposition", `inline; filename="${file.file_name ?? "file"}"`);
  headers.set("Cache-Control", "private, max-age=60");
  if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));
  return new NextResponse(obj.Body as never, { status: 200, headers });
};
