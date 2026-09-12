import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJob, isSplatLabEnabled, jobDir } from "@/lib/splat-lab/job-store";
import { publishSplatLabExport } from "@/lib/splat-lab/publish-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const { user, isSlateCeo, orgId } = await resolveServerOrgContext();
  if (!user || !isSlateCeo) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!orgId) return NextResponse.json({ error: "no organization" }, { status: 400 });

  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { projectId?: string; title?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const dir = jobDir(id);
  const files = ["output.spz", "output.ply", join("export", "output.ply")]
    .map((rel) => join(dir, rel))
    .filter((p, i, arr) => existsSync(p) && arr.indexOf(p) === i);

  try {
    const published = await publishSplatLabExport({
      admin: createAdminClient(),
      projectId, orgId, userId: user.id, jobId: id,
      title: body.title?.trim() || `Splat Lab ${id}`,
      files,
    });
    return NextResponse.json({ ok: true, published });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "publish failed" }, { status: 500 });
  }
}
