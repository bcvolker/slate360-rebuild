import { NextResponse } from "next/server";
import { getJob, isSplatLabEnabled, jobModelSize, readJobModel } from "@/lib/splat-lab/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = readJobModel(id);
  if (!buf) return NextResponse.json({ error: "no model yet" }, { status: 404 });
  const size = jobModelSize(id) ?? buf.length;
  const ext = job.modelPath?.endsWith(".spz") ? "spz" : "ply";
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": ext === "spz" ? "application/octet-stream" : "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "no-store",
    },
  });
}
