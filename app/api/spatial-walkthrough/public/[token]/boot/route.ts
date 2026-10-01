import { NextRequest, NextResponse } from "next/server";

import { loadPublicWalkBoot } from "@/lib/spatial-walkthrough/public-boot";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const boot = await loadPublicWalkBoot(token, req.cookies);
  const status = boot.accessState === "denied" ? 404 : boot.accessState === "password" ? 401 : 200;
  return NextResponse.json(boot, { status });
};
