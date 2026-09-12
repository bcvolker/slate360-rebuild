import { NextResponse } from "next/server";
import { startJob, isSplatLabEnabled, type RunOptions } from "@/lib/splat-lab/job-store";
import type { SplatLabClone } from "@/lib/splat-lab/clones";
import type { SphericalMode, TrainStrategy, ViewImageSize } from "@/lib/splat-lab/job-types";

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
  const clone: SplatLabClone = body.clone === "lab" ? "lab" : "proven";
  const opts: RunOptions = {
    input,
    clone,
    workspaceName: body.workspaceName ? String(body.workspaceName) : undefined,
    is360: Boolean(body.is360),
    fps: Number(body.fps ?? 4),
    removePeople: Boolean(body.removePeople),
    sphericalMode: (body.sphericalMode === "rig" ? "rig" : "native") as SphericalMode,
    imageSize: String(body.imageSize ?? "auto"),
    maxDuration: Number(body.maxDuration ?? 0),
    maxFeatures: Number(body.maxFeatures ?? 16384),
    viewImageSize: (String(body.viewImageSize ?? "1280")) as ViewImageSize,
    shDegree: Number(body.shDegree ?? 3),
    maxSplatsMillions: Number(body.maxSplatsMillions ?? 0),
    trainingSteps: Number(body.trainingSteps ?? 0),
    imagesPerStep: Number(body.imagesPerStep ?? 2),
    preset: String(body.preset ?? "classic"),
    quality: String(body.quality ?? (clone === "proven" ? "auto" : "medium")),
    strategy: (body.strategy === "mcmc" ? "mcmc" : "default") as TrainStrategy,
    useBilateralGrid: Boolean(body.useBilateralGrid),
    useLidar: Boolean(body.useLidar),
    useRtk: Boolean(body.useRtk),
  };
  if (!Number.isFinite(opts.fps) || opts.fps <= 0) {
    return NextResponse.json({ error: "fps must be > 0" }, { status: 400 });
  }
  const id = startJob(opts);
  return NextResponse.json({ id });
}
