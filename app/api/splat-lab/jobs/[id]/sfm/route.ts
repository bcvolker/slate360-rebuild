import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getJob, isSplatLabEnabled, jobDir } from "@/lib/splat-lab/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!getJob(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const path = join(jobDir(id), "sfm", "preview.json");
  if (!existsSync(path)) return NextResponse.json({ error: "no SfM preview yet" }, { status: 404 });
  return NextResponse.json(JSON.parse(readFileSync(path, "utf-8")));
}
