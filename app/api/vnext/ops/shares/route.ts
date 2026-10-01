import { NextResponse, type NextRequest } from "next/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { listScopedProjectsForUser } from "@/lib/projects/access";
import { createShareLink, rejectUnlessOwner, revokeOwnedShare } from "@/lib/vnext/share/share-command";

export async function POST(req: NextRequest) {
  const org = await resolveServerOrgContext();
  const denied = rejectUnlessOwner(Boolean(org.user && org.canAccessOperationsConsole));
  if (denied || !org.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as {
    action?: unknown;
    target?: unknown;
    projectId?: unknown;
    savedViewId?: unknown;
    label?: unknown;
    expiresOn?: unknown;
    linkId?: unknown;
  } | null;
  const listed = await listScopedProjectsForUser(org.user.id);
  const allowed = ((listed.projects ?? []) as Array<{ id: string }>).map((project) => project.id);
  const admin = createAdminClient();
  if (body?.action === "revoke") {
    const result = await revokeOwnedShare(admin, typeof body.linkId === "string" ? body.linkId : "", allowed);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }
  if (body?.action !== "create" || typeof body.projectId !== "string" || typeof body.target !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await createShareLink(admin, {
    actorId: org.user.id,
    allowedProjectIds: allowed,
    target: body.target,
    projectId: body.projectId,
    savedViewId: typeof body.savedViewId === "string" && body.savedViewId ? body.savedViewId : null,
    label: typeof body.label === "string" ? body.label : null,
    expiresOn: typeof body.expiresOn === "string" ? body.expiresOn : null,
    now: new Date(),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, url: result.url });
}
