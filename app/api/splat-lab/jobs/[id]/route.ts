import { NextResponse } from "next/server";
import { cancelJob, deleteJob, getJob, isSplatLabEnabled } from "@/lib/splat-lab/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const { id } = await ctx.params;
  deleteJob(id);
  return NextResponse.json({ ok: true });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const ok = cancelJob(id);
  return NextResponse.json({ ok });
}
