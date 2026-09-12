import { NextResponse } from "next/server";
import { isSplatLabEnabled, rerunJob } from "@/lib/splat-lab/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STAGES = new Set(["frames", "mask", "sfm", "views", "train", "export"]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* fromStage optional */ }
  const fromStage = String(body.fromStage ?? "sfm");
  if (!VALID_STAGES.has(fromStage)) {
    return NextResponse.json({ error: `fromStage must be one of ${[...VALID_STAGES].join(", ")}` }, { status: 400 });
  }
  const ok = await rerunJob(id, fromStage);
  if (!ok) return NextResponse.json({ error: "job not found or has no saved config" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
