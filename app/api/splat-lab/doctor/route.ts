import { NextResponse } from "next/server";
import { isSplatLabEnabled } from "@/lib/splat-lab/job-store";
import { getDoctorReport } from "@/lib/splat-lab/doctor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  const report = await getDoctorReport(force);
  return NextResponse.json(report);
}
