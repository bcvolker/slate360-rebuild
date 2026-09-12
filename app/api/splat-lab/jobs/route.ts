import { NextResponse } from "next/server";
import { isSplatLabEnabled, listJobs } from "@/lib/splat-lab/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  return NextResponse.json({ jobs: listJobs() });
}
