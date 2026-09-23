import { NextResponse, type NextRequest } from "next/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyReleaseAction, parseReleaseAction } from "@/lib/vnext/ops/release-command";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, ctx: Params) {
  const org = await resolveServerOrgContext();
  if (!org.user || !org.canAccessOperationsConsole) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { projectId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    action?: unknown;
    representation?: unknown;
    sourceId?: unknown;
    note?: unknown;
    needsRecapture?: unknown;
  } | null;
  const action = parseReleaseAction(body?.action);
  if (!action || typeof body?.representation !== "string" || typeof body.sourceId !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await applyReleaseAction(createAdminClient(), {
    projectId,
    representation: body.representation,
    sourceId: body.sourceId,
    action,
    actorId: org.user.id,
    note: typeof body.note === "string" ? body.note : null,
    needsRecapture: body.needsRecapture === true,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
