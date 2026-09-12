import { NextResponse } from "next/server";
import { startJob, isSplatLabEnabled, type RunOptions } from "@/lib/splat-lab/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const input = String(body.input ?? "").trim();
  if (!input) {
    return NextResponse.json({ error: "input path is required" }, { status: 400 });
  }
  const opts: RunOptions = {
    input,
    is360: Boolean(body.is360),
    fps: Number(body.fps ?? 4),
    removePeople: Boolean(body.removePeople),
    sfmMode: String(body.sfmMode ?? "faster"),
    imageSize: String(body.imageSize ?? "auto"),
    maxDuration: Number(body.maxDuration ?? 0),
    precompute360Faces: body.precompute360Faces !== false,
    resolutionLimit: Number(body.resolutionLimit ?? 1920),
    shDegree: Number(body.shDegree ?? 1),
    maxSplatsMillions: Number(body.maxSplatsMillions ?? 1.5),
    trainingSteps: Number(body.trainingSteps ?? 0),
    preset: String(body.preset ?? "classic"),
    quality: String(body.quality ?? "auto"),
  };
  if (!Number.isFinite(opts.fps) || opts.fps <= 0) {
    return NextResponse.json({ error: "fps must be > 0" }, { status: 400 });
  }
  const id = startJob(opts);
  return NextResponse.json({ id });
}
