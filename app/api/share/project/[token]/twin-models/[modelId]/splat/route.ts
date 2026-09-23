import { NextResponse, type NextRequest } from "next/server";
import { streamPublicTwin } from "@/lib/vnext/share/public-media";

export const runtime = "nodejs";

export function GET(req: NextRequest, ctx: { params: Promise<{ token: string; modelId: string }> }) {
  return ctx.params.then(({ token, modelId }) => streamPublicTwin(token, modelId, req.nextUrl.searchParams.get("baked") === "1"));
}
